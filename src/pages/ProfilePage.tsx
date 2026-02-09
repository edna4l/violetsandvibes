import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useProfile } from "../hooks/useProfile";
import { useUserLikes } from "../hooks/useUserLikes";
import { useAuth } from "../hooks/useAuth";

import { Card, CardContent } from "../components/ui/card";
import MatchNotification from "../components/MatchNotification";
import EnhancedProfileCard from "../components/EnhancedProfileCard";
import EnhancedProfileDetailModal from "../components/EnhancedProfileDetailModal";
import VirtualGiftModal from "../components/VirtualGiftModal";
import GameSelectionModal from "../components/GameSelectionModal";
import EnhancedInteractiveGame from "../components/EnhancedInteractiveGame";

const UserProfilesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profiles, loading } = useProfile();
  const { toggleLike, isLiked } = useUserLikes();

  const [matchNotification, setMatchNotification] = useState<{ isOpen: boolean; matchedUser: any }>({
    isOpen: false,
    matchedUser: null,
  });

  const [profileDetail, setProfileDetail] = useState<{ isOpen: boolean; profile: any }>({
    isOpen: false,
    profile: null,
  });

  const [giftModal, setGiftModal] = useState<{ isOpen: boolean; profile: any }>({
    isOpen: false,
    profile: null,
  });

  const [gameModal, setGameModal] = useState<{ isOpen: boolean; profile: any }>({
    isOpen: false,
    profile: null,
  });

  const [activeGame, setActiveGame] = useState<any>(null);

  const handleLike = async (profile: any) => {
    const result = await toggleLike(profile.user_id);
    if (result.isMatch && result.matchedProfile) {
      setMatchNotification({ isOpen: true, matchedUser: result.matchedProfile });
    }
  };

  const handleMessage = (profile: any) => {
    navigate("/messages", { state: { selectedProfile: profile } });
  };

  const handleSendGift = (profile: any) => setGiftModal({ isOpen: true, profile });
  const handlePlayGame = (profile: any) => setGameModal({ isOpen: true, profile });
  const handleViewProfile = (profile: any) => setProfileDetail({ isOpen: true, profile });

  const handleStartChat = () => {
    setMatchNotification({ isOpen: false, matchedUser: null });
    if (matchNotification.matchedUser) {
      handleMessage(matchNotification.matchedUser);
    }
  };

  const onSendGift = (giftData: any) => {
    console.log("Sending gift:", giftData);
    // TODO: Implement gift sending logic
  };

  const onStartGame = (gameData: any) => {
    console.log("Starting game:", gameData);
    setActiveGame(gameData);
  };

  const getGameType = (gameName: string) => {
    if (!gameName) return "icebreaker";
    const name = gameName.toLowerCase();
    if (name.includes("trivia") || name.includes("quiz")) return "trivia";
    if (name.includes("icebreaker") || name.includes("conversation")) return "icebreaker";
    if (name.includes("compatibility") || name.includes("match") || name.includes("love")) return "compatibility";
    if (name.includes("puzzle") || name.includes("riddle") || name.includes("challenge")) return "puzzle";
    if (name.includes("word") || name.includes("text")) return "wordgame";
    if (name.includes("memory") || name.includes("remember")) return "memory";
    if (name.includes("speed") || name.includes("quick") || name.includes("fast")) return "speed";
    if (name.includes("creative") || name.includes("expression") || name.includes("art")) return "creative";
    return "icebreaker";
  };

  const canViewPrivateContent = (profile: any) => {
    if (!profile.privacy_settings) return true;
    if (isLiked(profile.user_id) && profile.likes_current_user) return true;
    switch (profile.privacy_settings.profile_visibility) {
      case "public":
        return true;
      case "matches_only":
        return isLiked(profile.user_id) && profile.likes_current_user;
      case "private":
        return false;
      default:
        return true;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">Discover Profiles</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="w-full h-80 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Discover Profiles</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <EnhancedProfileCard
              key={profile.user_id}
              profile={profile}
              onLike={handleLike}
              onMessage={handleMessage}
              onVideoCall={() => {}}
              onSendGift={handleSendGift}
              onPlayGame={handlePlayGame}
              onViewProfile={handleViewProfile}
              isLiked={isLiked(profile.user_id)}
              showPrivateContent={canViewPrivateContent(profile)}
            />
          ))}
        </div>

        {profiles.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No profiles found.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <MatchNotification
        isOpen={matchNotification.isOpen}
        onClose={() => setMatchNotification({ isOpen: false, matchedUser: null })}
        matchedUser={matchNotification.matchedUser}
        onStartChat={handleStartChat}
      />

      <EnhancedProfileDetailModal
        isOpen={profileDetail.isOpen}
        onClose={() => setProfileDetail({ isOpen: false, profile: null })}
        profile={profileDetail.profile}
        onLike={handleLike}
        onMessage={handleMessage}
        onVideoCall={() => {}}
        onSendGift={handleSendGift}
        onPlayGame={handlePlayGame}
        isLiked={profileDetail.profile ? isLiked(profileDetail.profile.user_id) : false}
        showPrivateContent={profileDetail.profile ? canViewPrivateContent(profileDetail.profile) : false}
      />

      <VirtualGiftModal
        isOpen={giftModal.isOpen}
        onClose={() => setGiftModal({ isOpen: false, profile: null })}
        recipientName={giftModal.profile?.full_name || ""}
        onSendGift={onSendGift}
      />

      <GameSelectionModal
        isOpen={gameModal.isOpen}
        onClose={() => setGameModal({ isOpen: false, profile: null })}
        partnerName={gameModal.profile?.full_name || ""}
        onStartGame={onStartGame}
      />

      {/* Active Game Modal */}
      {activeGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="w-full max-w-md">
            <EnhancedInteractiveGame
              onClose={() => setActiveGame(null)}
              gameType={getGameType(activeGame.name)}
              isMultiplayer={activeGame.isMultiplayer || false}
              partnerId={gameModal.profile?.user_id}
              partnerName={gameModal.profile?.full_name}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfilesListPage;
