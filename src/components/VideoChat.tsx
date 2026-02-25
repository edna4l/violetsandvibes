import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Camera, Settings } from 'lucide-react';
import { APP_PREFERENCES_EVENT, getAutoPlayVideosEnabled } from '@/lib/appPreferences';

interface VideoChatProps {
  matchName?: string;
  onEndCall?: () => void;
}

const VideoChat: React.FC<VideoChatProps> = ({ matchName = "Alex", onEndCall }) => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [autoPlayVideos, setAutoPlayVideos] = useState<boolean>(() => getAutoPlayVideosEnabled());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  useEffect(() => {
    const syncAutoPlayPreference = () => {
      setAutoPlayVideos(getAutoPlayVideosEnabled());
    };

    syncAutoPlayPreference();
    window.addEventListener(APP_PREFERENCES_EVENT, syncAutoPlayPreference as EventListener);
    return () => {
      window.removeEventListener(APP_PREFERENCES_EVENT, syncAutoPlayPreference as EventListener);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startCall = () => {
    setIsCallActive(true);
    // In a real app, this would initialize WebRTC connection
  };

  const endCall = () => {
    setIsCallActive(false);
    setCallDuration(0);
    onEndCall?.();
  };

  const toggleVideo = () => setIsVideoOn(!isVideoOn);
  const toggleAudio = () => setIsAudioOn(!isAudioOn);

  if (!isCallActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-pink-100 to-purple-100 p-6">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{matchName[0]}</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Call {matchName}</h3>
            <p className="text-gray-600 mb-6">Start a video call to connect face-to-face</p>
            <Button 
              onClick={startCall}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <Video className="w-5 h-5 mr-2" />
              Start Video Call
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-black">
      {/* Remote Video */}
      <div className="absolute inset-0">
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover"
          autoPlay={autoPlayVideos}
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-32 h-32 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-4xl font-bold">{matchName[0]}</span>
            </div>
            <h3 className="text-2xl font-semibold">{matchName}</h3>
          </div>
        </div>
      </div>

      {/* Local Video */}
      <div className="absolute top-4 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
        <video
          ref={localVideoRef}
          className="w-full h-full object-cover"
          autoPlay={autoPlayVideos}
          playsInline
          muted
        />
        {!isVideoOn && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <VideoOff className="w-8 h-8 text-white" />
          </div>
        )}
      </div>

      {/* Call Duration */}
      <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
        {formatTime(callDuration)}
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-4">
        <Button
          onClick={toggleAudio}
          size="lg"
          className={`w-14 h-14 rounded-full ${
            isAudioOn 
              ? 'bg-gray-700 hover:bg-gray-600' 
              : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </Button>
        
        <Button
          onClick={toggleVideo}
          size="lg"
          className={`w-14 h-14 rounded-full ${
            isVideoOn 
              ? 'bg-gray-700 hover:bg-gray-600' 
              : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>
        
        <Button
          onClick={endCall}
          size="lg"
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};

export default VideoChat;
