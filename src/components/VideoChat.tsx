import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, PhoneOff, Video, VideoOff, Link2, Loader2 } from "lucide-react";
import { APP_PREFERENCES_EVENT, getAutoPlayVideosEnabled } from "@/lib/appPreferences";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface VideoChatProps {
  matchName?: string;
  onEndCall?: () => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const VideoChat: React.FC<VideoChatProps> = ({
  matchName = "Member",
  onEndCall,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [roomInput, setRoomInput] = useState("");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [statusText, setStatusText] = useState(
    "Create or join a room to start a video call."
  );
  const [autoPlayVideos, setAutoPlayVideos] = useState<boolean>(() =>
    getAutoPlayVideosEnabled()
  );

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const activeRoomRef = useRef<string | null>(null);
  const isHostRef = useRef(false);
  const callDurationTimerRef = useRef<number | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const setRoomQueryParam = (room: string | null) => {
    const url = new URL(window.location.href);
    if (room) {
      url.searchParams.set("room", room);
    } else {
      url.searchParams.delete("room");
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  };

  const stopStream = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => {
      track.stop();
    });
  };

  const attachStream = (videoRef: React.RefObject<HTMLVideoElement>, stream: MediaStream | null) => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) {
      void video.play().catch(() => {
        // ignore autoplay errors
      });
    }
  };

  const flushPendingIceCandidates = async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    const pending = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];

    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // ignore stale candidates
      }
    }
  };

  const sendSignal = async (event: string, payload: Record<string, unknown>) => {
    const channel = signalingChannelRef.current;
    const roomId = activeRoomRef.current;
    if (!channel || !roomId) return;

    await channel.send({
      type: "broadcast",
      event,
      payload: {
        ...payload,
        senderId: user?.id ?? null,
        roomId,
      },
    });
  };

  const teardownSession = async (notifyRemote: boolean) => {
    if (notifyRemote && signalingChannelRef.current && activeRoomRef.current) {
      try {
        await sendSignal("hangup", { reason: "ended" });
      } catch {
        // ignore
      }
    }

    const channel = signalingChannelRef.current;
    signalingChannelRef.current = null;
    if (channel) {
      supabase.removeChannel(channel);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    stopStream(localStreamRef.current);
    stopStream(remoteStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    attachStream(localVideoRef, null);
    attachStream(remoteVideoRef, null);

    pendingIceCandidatesRef.current = [];
    activeRoomRef.current = null;
    isHostRef.current = false;

    setActiveRoomId(null);
    setRemoteConnected(false);
    setIsConnecting(false);
    setIsCallActive(false);
    setCallDuration(0);
    setStatusText("Call ended.");
    setRoomQueryParam(null);
  };

  const endCall = async (notifyRemote = true) => {
    await teardownSession(notifyRemote);
    onEndCall?.();
  };

  const createPeerConnection = (localStream: MediaStream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      void sendSignal("ice-candidate", { candidate: event.candidate.toJSON() });
    };

    pc.ontrack = (event) => {
      const [incomingStream] = event.streams;
      if (incomingStream) {
        remoteStreamRef.current = incomingStream;
        attachStream(remoteVideoRef, incomingStream);
      } else {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(event.track);
        attachStream(remoteVideoRef, remoteStreamRef.current);
      }

      setRemoteConnected(true);
      setStatusText("Connected");
      void flushPendingIceCandidates();
    };

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case "connecting":
          setIsConnecting(true);
          setStatusText("Connecting...");
          break;
        case "connected":
          setIsConnecting(false);
          setIsCallActive(true);
          setStatusText("Connected");
          break;
        case "disconnected":
          setStatusText("Connection interrupted...");
          break;
        case "failed":
          setStatusText("Connection failed.");
          break;
        case "closed":
          setIsCallActive(false);
          break;
        default:
          break;
      }
    };

    return pc;
  };

  const setupSignalingChannel = (roomId: string) => {
    const channel = supabase.channel(`vv-video-room-${roomId}`);
    signalingChannelRef.current = channel;

    channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
      const senderId = (payload as any)?.senderId as string | undefined;
      if (!payload || senderId === user?.id || isHostRef.current) return;

      const offer = (payload as any)?.offer as RTCSessionDescriptionInit | undefined;
      const pc = peerConnectionRef.current;
      if (!offer || !pc) return;

      try {
        await pc.setRemoteDescription(offer);
        await flushPendingIceCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal("answer", { answer: pc.localDescription });

        setStatusText("Answer sent. Connecting...");
      } catch (error) {
        console.error("Failed to handle offer:", error);
      }
    });

    channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
      const senderId = (payload as any)?.senderId as string | undefined;
      if (!payload || senderId === user?.id || !isHostRef.current) return;

      const answer = (payload as any)?.answer as RTCSessionDescriptionInit | undefined;
      const pc = peerConnectionRef.current;
      if (!answer || !pc) return;

      try {
        await pc.setRemoteDescription(answer);
        await flushPendingIceCandidates();
      } catch (error) {
        console.error("Failed to handle answer:", error);
      }
    });

    channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
      const senderId = (payload as any)?.senderId as string | undefined;
      if (!payload || senderId === user?.id) return;

      const candidate = (payload as any)?.candidate as RTCIceCandidateInit | undefined;
      const pc = peerConnectionRef.current;
      if (!candidate || !pc) return;

      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (error) {
          console.error("Could not add ICE candidate:", error);
        }
      } else {
        pendingIceCandidatesRef.current.push(candidate);
      }
    });

    channel.on("broadcast", { event: "hangup" }, ({ payload }) => {
      const senderId = (payload as any)?.senderId as string | undefined;
      if (!payload || senderId === user?.id) return;

      setStatusText("The other user ended the call.");
      void endCall(false);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnecting(false);

        if (isHostRef.current) {
          const pc = peerConnectionRef.current;
          if (!pc) return;
          setStatusText("Room ready. Waiting for someone to join...");
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendSignal("offer", { offer: pc.localDescription });
          } catch (error) {
            console.error("Could not create offer:", error);
            setStatusText("Could not start the call.");
          }
        } else {
          setStatusText("Joined room. Waiting for host...");
        }
      }

      if (status === "CHANNEL_ERROR") {
        setIsConnecting(false);
        setStatusText("Realtime channel error. Try again.");
      }
    });
  };

  const startCall = async (roomId: string, host: boolean) => {
    if (!user?.id) {
      setStatusText("You must be signed in to use video chat.");
      return;
    }

    const normalizedRoom = roomId.trim().toLowerCase();
    if (!normalizedRoom) {
      setStatusText("Enter a valid room code.");
      return;
    }

    await teardownSession(false);

    setIsHost(host);
    isHostRef.current = host;
    setIsConnecting(true);
    setIsCallActive(false);
    setRemoteConnected(false);
    setCallDuration(0);
    setStatusText(host ? "Creating room..." : "Joining room...");

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = localStream;
      setIsVideoOn(true);
      setIsAudioOn(true);
      attachStream(localVideoRef, localStream);

      const pc = createPeerConnection(localStream);
      peerConnectionRef.current = pc;

      activeRoomRef.current = normalizedRoom;
      setActiveRoomId(normalizedRoom);
      setRoomInput(normalizedRoom);
      setRoomQueryParam(normalizedRoom);

      setupSignalingChannel(normalizedRoom);
    } catch (error: any) {
      console.error("Could not start video call:", error);
      setStatusText(error?.message || "Could not access camera/mic.");
      setIsConnecting(false);
      await teardownSession(false);
    }
  };

  const handleCreateRoom = async () => {
    const generated = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10))
      .slice(0, 8)
      .toLowerCase();
    await startCall(generated, true);
  };

  const handleJoinRoom = async () => {
    await startCall(roomInput, false);
  };

  const toggleAudio = () => {
    const next = !isAudioOn;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setIsAudioOn(next);
  };

  const toggleVideo = () => {
    const next = !isVideoOn;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setIsVideoOn(next);
  };

  const copyInviteLink = async () => {
    const room = activeRoomRef.current;
    if (!room) return;
    const link = `${window.location.origin}/video?room=${encodeURIComponent(room)}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Invite link copied",
        description: "Send this link to the person you want to call.",
      });
    } catch {
      toast({
        title: "Could not copy link",
        description: link,
      });
    }
  };

  useEffect(() => {
    const syncAutoPlayPreference = () => {
      setAutoPlayVideos(getAutoPlayVideosEnabled());
    };

    syncAutoPlayPreference();
    window.addEventListener(
      APP_PREFERENCES_EVENT,
      syncAutoPlayPreference as EventListener
    );

    return () => {
      window.removeEventListener(
        APP_PREFERENCES_EVENT,
        syncAutoPlayPreference as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const initialRoom = new URLSearchParams(window.location.search).get("room");
    if (initialRoom) {
      setRoomInput(initialRoom);
    }
  }, []);

  useEffect(() => {
    if (!isCallActive) {
      if (callDurationTimerRef.current) {
        window.clearInterval(callDurationTimerRef.current);
        callDurationTimerRef.current = null;
      }
      return;
    }

    callDurationTimerRef.current = window.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      if (callDurationTimerRef.current) {
        window.clearInterval(callDurationTimerRef.current);
        callDurationTimerRef.current = null;
      }
    };
  }, [isCallActive]);

  useEffect(() => {
    return () => {
      void teardownSession(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!activeRoomId) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-pink-100/80 via-purple-100/80 to-indigo-100/80 p-4 sm:p-6">
        <Card className="w-full max-w-lg bg-white/90 border-white/70 backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">Video Chat</h2>
              <p className="text-sm text-gray-700">
                Create a room or enter a room code to connect face-to-face.
              </p>
            </div>

            <Input
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Enter room code"
              className="bg-white border-gray-300 text-gray-900"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                onClick={() => void handleCreateRoom()}
                disabled={isConnecting}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                {isConnecting && isHost ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Video className="w-4 h-4 mr-2" />
                )}
                Create Room
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleJoinRoom()}
                disabled={isConnecting || !roomInput.trim()}
              >
                {isConnecting && !isHost ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Join Room
              </Button>
            </div>

            <div className="text-xs text-gray-600 text-center">{statusText}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-black min-h-[560px]">
      <div className="absolute inset-0">
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover"
          autoPlay={autoPlayVideos}
          playsInline
        />
        {!remoteConnected && (
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/25 to-purple-500/25 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-semibold">
                {(matchName[0] || "M").toUpperCase()}
              </div>
              <div className="text-lg font-medium">Waiting for the other person…</div>
              <div className="text-sm text-white/80 mt-1">{statusText}</div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap items-center gap-2">
        <div className="bg-black/55 text-white px-3 py-1 rounded-full text-xs sm:text-sm">
          Room: {activeRoomId}
        </div>
        <div className="bg-black/55 text-white px-3 py-1 rounded-full text-xs sm:text-sm">
          {formatTime(callDuration)}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="bg-black/55 border-white/30 text-white hover:bg-black/70"
          onClick={() => void copyInviteLink()}
        >
          <Link2 className="w-3 h-3 mr-1" />
          Invite
        </Button>
      </div>

      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-28 h-40 sm:w-36 sm:h-52 bg-gray-900 rounded-lg overflow-hidden border border-white/20">
        <video
          ref={localVideoRef}
          className="w-full h-full object-cover"
          autoPlay={autoPlayVideos}
          playsInline
          muted
        />
        {!isVideoOn && (
          <div className="absolute inset-0 bg-gray-800/90 flex items-center justify-center">
            <VideoOff className="w-7 h-7 text-white" />
          </div>
        )}
      </div>

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-xs sm:text-sm text-white/85 bg-black/50 px-3 py-1 rounded-full">
        {isConnecting ? "Connecting…" : statusText}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <Button
          onClick={toggleAudio}
          size="lg"
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${
            isAudioOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>

        <Button
          onClick={toggleVideo}
          size="lg"
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${
            isVideoOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>

        <Button
          onClick={() => void endCall(true)}
          size="lg"
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500 hover:bg-red-600"
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default VideoChat;
