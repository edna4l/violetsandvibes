import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Edit, MapPin, Camera, Star, Loader2, UserPlus } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import ProfileMenu from "@/components/ProfileMenu";
import MessageButton from "@/components/MessageButton";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

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

type EditableProfileForm = {
  full_name: string;
  location: string;
  bio: string;
  gender_identity: string;
  sexual_orientation: string;
  interestsText: string;
  primaryPhoto: string;
};

const EMPTY_FORM: EditableProfileForm = {
  full_name: "",
  location: "",
  bio: "",
  gender_identity: "",
  sexual_orientation: "",
  interestsText: "",
  primaryPhoto: "",
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => `${item ?? ""}`.trim()).filter(Boolean);
}

function formFromProfile(profile: any): EditableProfileForm {
  const interests = toStringArray(profile?.interests);
  const photos = toStringArray(profile?.photos);

  return {
    full_name: profile?.full_name ?? "",
    location: profile?.location ?? "",
    bio: profile?.bio ?? "",
    gender_identity: profile?.gender_identity ?? "",
    sexual_orientation: profile?.sexual_orientation ?? "",
    interestsText: interests.join(", "),
    primaryPhoto: photos[0] ?? "",
  };
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();

  /**
   * Convention:
   * - /profile -> show my profile
   * - /profile/:id -> show that user
   */
  const targetId = id || user?.id || undefined;

  // Keep hook order stable on every render.
  const { profile, loading, error, updateProfile } = useProfile(targetId);
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditableProfileForm>(EMPTY_FORM);

  const isOwnProfile = !!user && !!profile && profile.id === user.id;
  const [liked, setLiked] = useState(false);
  const [matched, setMatched] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [matchConversationId, setMatchConversationId] = useState<string | null>(null);

  const otherUserId = !isOwnProfile ? (profile?.id as string | undefined) : undefined;

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

  useEffect(() => {
    if (!profile || editing) return;
    setFormData(formFromProfile(profile));
  }, [profile, editing]);

  useEffect(() => {
    const run = async () => {
      if (!user || !otherUserId) {
        setLiked(false);
        setMatched(false);
        setMatchConversationId(null);
        return;
      }

      setLikeError(null);

      // 1) Did I already like them?
      const { data: likeRow, error: likeErr } = await supabase
        .from("likes")
        .select("id")
        .eq("liker_id", user.id)
        .eq("liked_id", otherUserId)
        .maybeSingle();

      if (likeErr) {
        console.warn("like lookup failed:", likeErr.message);
      }
      setLiked(!!likeRow);

      // 2) Are we matched?
      // NOTE: this project stores matches as user1_id/user2_id.
      const a = user.id < otherUserId ? user.id : otherUserId;
      const b = user.id < otherUserId ? otherUserId : user.id;

      const { data: matchRow, error: matchErr } = await supabase
        .from("matches")
        .select("id, conversation_id")
        .eq("user1_id", a)
        .eq("user2_id", b)
        .maybeSingle();

      if (matchErr) {
        console.warn("match lookup failed:", matchErr.message);
      }
      setMatched(!!matchRow);
      setMatchConversationId(matchRow?.conversation_id ?? null);
    };

    void run();
  }, [user?.id, otherUserId]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    if (!(name in formData)) return;
    setFormData((prev) => ({ ...prev, [name as keyof EditableProfileForm]: value }));
  };

  const startEditing = () => {
    if (!profile) return;
    setSaveError(null);
    setFormData(formFromProfile(profile));
    setEditing(true);
  };

  const cancelEditing = () => {
    if (profile) {
      setFormData(formFromProfile(profile));
    }
    setSaveError(null);
    setEditing(false);
  };

  const handleSubmit = async () => {
    if (!isOwnProfile || !profile || !user) return;

    const interests = formData.interestsText
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    const existingPhotos = toStringArray(profile.photos);
    const remainingPhotos = existingPhotos.slice(1);
    const nextPrimaryPhoto = formData.primaryPhoto.trim();
    const photos = nextPrimaryPhoto
      ? [nextPrimaryPhoto, ...remainingPhotos]
      : remainingPhotos;

    try {
      setIsSaving(true);
      setSaveError(null);

      const { error: updateError } = await updateProfile({
        full_name: formData.full_name.trim(),
        location: formData.location.trim(),
        bio: formData.bio.trim(),
        gender_identity: formData.gender_identity.trim(),
        sexual_orientation: formData.sexual_orientation.trim(),
        interests,
        photos,
        updated_at: new Date().toISOString(),
      });

      if (updateError) {
        setSaveError(updateError);
        return;
      }

      setEditing(false);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Failed to update profile";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLike = async () => {
    if (!user || !otherUserId) return;

    try {
      setLikeLoading(true);
      setLikeError(null);

      const { error: likeError } = await supabase
        .from("likes")
        .insert({
          liker_id: user.id,
          liked_id: otherUserId,
        });

      // If unique constraint already exists, treat as already liked.
      if (likeError && likeError.code !== "23505") throw likeError;
      setLiked(true);

      // Check whether they already liked me.
      const { data: theirLike, error: theirLikeErr } = await supabase
        .from("likes")
        .select("id")
        .eq("liker_id", otherUserId)
        .eq("liked_id", user.id)
        .maybeSingle();

      if (theirLikeErr) {
        console.warn("theirLike check failed:", theirLikeErr.message);
      }

      if (theirLike) {
        // Keep canonical order in this project schema.
        const a = user.id < otherUserId ? user.id : otherUserId;
        const b = user.id < otherUserId ? otherUserId : user.id;

        const { error: matchCreateErr } = await supabase
          .from("matches")
          .insert({
            user1_id: a,
            user2_id: b,
          });

        // Unique conflict means match already exists, which is okay.
        if (matchCreateErr && matchCreateErr.code !== "23505") {
          console.warn("match create failed:", matchCreateErr.message);
        }
      }

      // Load match after like to capture conversation_id if present.
      const a = user.id < otherUserId ? user.id : otherUserId;
      const b = user.id < otherUserId ? otherUserId : user.id;

      const { data: matchRow, error: matchLookupErr } = await supabase
        .from("matches")
        .select("id, conversation_id")
        .eq("user1_id", a)
        .eq("user2_id", b)
        .maybeSingle();

      if (matchLookupErr) {
        console.warn("match lookup failed:", matchLookupErr.message);
      }

      setMatched(!!matchRow);
      setMatchConversationId(matchRow?.conversation_id ?? null);

      if (matchRow) {
        toast({
          title: "It's a match 💜",
          description: "You can message them now.",
        });
      } else {
        toast({
          title: "Liked",
          description: "We’ll let you know if it’s a match.",
        });
      }
    } catch (likeSubmitError: any) {
      console.error("Error liking profile:", likeSubmitError);
      setLikeError(likeSubmitError?.message || "Please try again.");
      toast({
        title: "Could not like profile",
        description: likeSubmitError?.message || "Please try again.",
      });
    } finally {
      setLikeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-calm min-h-screen flex items-center justify-center p-4">
        <div className="glass-pride rounded-2xl p-6 w-full max-w-md text-center relative z-10">
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
        <Card className="bg-black/70 border-white/15 text-white w-full max-w-md relative z-10">
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
      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
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
                    onClick={() => {
                      if (editing) {
                        cancelEditing();
                        return;
                      }
                      startEditing();
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {editing ? "Cancel" : "Edit"}
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

        {isOwnProfile && editing && (
          <Card className="bg-black/70 border-white/15 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {saveError && (
                <div className="text-sm text-pink-200 bg-pink-900/20 border border-pink-400/30 rounded-md px-3 py-2">
                  {saveError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="profile-full-name">Display Name</Label>
                  <Input
                    id="profile-full-name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="bg-black/30 border-white/20 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="profile-location">Location</Label>
                  <Input
                    id="profile-location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="bg-black/30 border-white/20 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="profile-gender">Gender Identity</Label>
                  <Input
                    id="profile-gender"
                    name="gender_identity"
                    value={formData.gender_identity}
                    onChange={handleChange}
                    className="bg-black/30 border-white/20 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="profile-orientation">Sexual Orientation</Label>
                  <Input
                    id="profile-orientation"
                    name="sexual_orientation"
                    value={formData.sexual_orientation}
                    onChange={handleChange}
                    className="bg-black/30 border-white/20 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="profile-bio">Bio</Label>
                <Textarea
                  id="profile-bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  className="bg-black/30 border-white/20 text-white resize-none"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="profile-interests">Interests (comma separated)</Label>
                <Input
                  id="profile-interests"
                  name="interestsText"
                  value={formData.interestsText}
                  onChange={handleChange}
                  className="bg-black/30 border-white/20 text-white"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="profile-photo" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Primary Photo URL
                </Label>
                <Input
                  id="profile-photo"
                  name="primaryPhoto"
                  type="url"
                  value={formData.primaryPhoto}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="bg-black/30 border-white/20 text-white"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => void handleSubmit()} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={cancelEditing}
                  disabled={isSaving}
                >
                  Cancel
                </Button>

                <Button
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => navigate("/edit-profile")}
                  disabled={isSaving}
                >
                  Open Advanced Editor
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3 pb-8">
          {isOwnProfile ? (
            <>
              <Button
                className="w-full"
                onClick={() => {
                  if (editing) {
                    cancelEditing();
                    return;
                  }
                  startEditing();
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                {editing ? "Close inline editor" : "Edit my profile"}
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
            <div className="space-y-3">
              {matched ? (
                <>
                  <div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    Matched 💜 You can message each other.
                  </div>

                  <MessageButton
                    userId={profile.id}
                    userName={displayName}
                    className="w-full"
                  />
                </>
              ) : (
                <>
                  <Button
                    className="w-full bg-pink-500 hover:bg-pink-600"
                    onClick={handleLike}
                    disabled={likeLoading || liked}
                  >
                    {likeLoading ? "Liking…" : liked ? "Liked 💜" : "Like this person 💜"}
                  </Button>

                  <MessageButton
                    userId={profile.id}
                    userName={displayName}
                    className="w-full"
                  />

                  {likeError && (
                    <div className="text-sm text-pink-200 bg-pink-900/20 border border-pink-400/30 rounded-md px-3 py-2">
                      {likeError}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
