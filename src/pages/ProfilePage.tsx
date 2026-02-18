import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, MapPin, Star, Loader2, UserPlus } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import MessageButton from "@/components/MessageButton";
import ProfileMenu from "@/components/ProfileMenu";

function calcAge(birthdate?: string | null) {
  if (!birthdate) return null;
  const d = new Date(birthdate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function getInitials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "V";
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  /**
   * Convention:
   * - /profile -> show my profile
   * - /profile/:id -> show that user
   */
  const targetId = id || user?.id || null;

  // If you're not logged in and trying to view /profile, send to signin.
  if (!id && !user) {
    navigate("/signin?redirect=/profile", { replace: true });
    return null;
  }

  const { profile, loading, error } = useProfile(targetId || undefined);

  const isOwnProfile = !!user && !!profile && profile.id === user.id;

  const displayName = useMemo(() => {
    return (
      profile?.full_name ||
      profile?.name ||
      profile?.username ||
      "Member"
    );
  }, [profile]);

  const age = useMemo(() => calcAge(profile?.birthdate), [profile?.birthdate]);

  const profilePhoto = useMemo(() => {
    const p = profile?.photos?.[0];
    return p || "";
  }, [profile?.photos]);

  if (loading) {
    return (
      <div className="page-calm min-h-screen flex items-center justify-center p-4">
        <div className="glass-pride rounded-2xl p-6 w-full max-w-md text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-white" />
          <p className="text-white/90">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    const isMeRoute = !id; // /profile
    return (
      <div className="page-calm min-h-screen flex items-center justify-center p-4">
        <Card className="bg-black/70 border-white/15 text-white w-full max-w-md">
          <CardContent className="p-6 text-center space-y-3">
            <div className="text-xl font-semibold">No profile found</div>
            <div className="text-white/80">
              {isMeRoute
                ? "You haven’t created your profile yet."
                : "This profile might not exist or is unavailable."}
            </div>

            {isMeRoute ? (
              <Button
                className="w-full"
                onClick={() => navigate("/create-new-profile")}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create your profile
              </Button>
            ) : (
              <Button className="w-full" variant="outline" onClick={() => navigate("/social")}>
                Back to Social
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-calm min-h-screen p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header card */}
        <Card className="bg-black/70 border-white/15 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <Avatar className="w-28 h-28 border-2 border-white/20">
                {profilePhoto ? <AvatarImage src={profilePhoto} /> : null}
                <AvatarFallback className="bg-white/10 text-white text-xl font-semibold">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>

              <div>
                <div className="text-2xl font-semibold">
                  {displayName}
                  {age != null ? `, ${age}` : ""}
                </div>

                {profile.location ? (
                  <div className="flex items-center justify-center gap-1 text-white/80 mt-2">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                ) : null}
              </div>

              {/* tags */}
              <div className="flex flex-wrap gap-2 justify-center">
                {profile.gender_identity ? (
                  <Badge className="bg-white/10 border-white/15 text-white">
                    {profile.gender_identity}
                  </Badge>
                ) : null}
                {profile.sexual_orientation ? (
                  <Badge className="bg-white/10 border-white/15 text-white">
                    {profile.sexual_orientation}
                  </Badge>
                ) : null}

                {(profile.interests || []).slice(0, 10).map((interest: string, idx: number) => (
                  <Badge
                    key={`${interest}-${idx}`}
                    className="bg-white/10 border-white/15 text-white"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="bg-black/70 border-white/15 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              About
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10"
                    onClick={() => navigate("/edit-profile")}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <ProfileMenu userId={profile.id} userName={displayName} />
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
              {(profile.bio || "").trim() || "No bio yet."}
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3 pb-8">
          {isOwnProfile ? (
            <>
              <Button className="w-full" onClick={() => navigate("/edit-profile")}>
                <Edit className="w-4 h-4 mr-2" />
                Edit my profile
              </Button>

              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
                onClick={() => navigate("/subscription")}
              >
                <Star className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
            </>
          ) : (
            <MessageButton
              userId={profile.id}
              userName={displayName}
              className="w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
