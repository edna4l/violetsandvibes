import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BottomNavigation from "@/components/BottomNavigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Users, Plus, Loader2, Search, Lock } from "lucide-react";

type Group = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  privacy: string;
  member_count: number;
  post_count: number;
  cover_image: string | null;
  creator_id: string;
  created_at: string;
  isMember?: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  city: "City / Local",
  identity: "Identity",
  interests: "Interests",
  support: "Support",
  activism: "Activism",
  dating: "Dating",
  friends: "Friends",
};

const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    category: "general",
    privacy: "public",
  });
  const [creating, setCreating] = useState(false);

  const loadGroups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: groupRows, error } = await supabase
        .from("groups")
        .select("id, name, description, category, privacy, member_count, post_count, cover_image, creator_id, created_at")
        .eq("privacy", "public")
        .order("member_count", { ascending: false })
        .limit(50);

      if (error) throw error;

      const { data: memberRows } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      const myGroupIds = new Set((memberRows ?? []).map((r: any) => r.group_id));

      setGroups(
        (groupRows ?? []).map((g: any) => ({
          ...g,
          isMember: myGroupIds.has(g.id),
        }))
      );
    } catch (e: any) {
      toast({ title: "Could not load groups", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, [user?.id]);

  const handleJoin = async (groupId: string) => {
    if (!user) return;
    setJoiningId(groupId);
    try {
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: user.id,
        role: "member",
      });
      if (error && error.code !== "23505") throw error;

      // bump member_count optimistically
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, isMember: true, member_count: g.member_count + 1 }
            : g
        )
      );
      toast({ title: "Joined group 💜" });
    } catch (e: any) {
      toast({ title: "Could not join group", description: e?.message, variant: "destructive" });
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = async (groupId: string) => {
    if (!user) return;
    setJoiningId(groupId);
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);
      if (error) throw error;
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, isMember: false, member_count: Math.max(0, g.member_count - 1) }
            : g
        )
      );
    } catch (e: any) {
      toast({ title: "Could not leave group", description: e?.message, variant: "destructive" });
    } finally {
      setJoiningId(null);
    }
  };

  const handleCreate = async () => {
    if (!user || !newGroup.name.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("groups")
        .insert({
          name: newGroup.name.trim(),
          description: newGroup.description.trim() || null,
          category: newGroup.category,
          privacy: newGroup.privacy,
          creator_id: user.id,
          member_count: 1,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Auto-join as owner
      await supabase.from("group_members").insert({
        group_id: data.id,
        user_id: user.id,
        role: "owner",
      });

      setShowCreate(false);
      setNewGroup({ name: "", description: "", category: "general", privacy: "public" });
      toast({ title: "Group created! 🎉" });
      await loadGroups();
    } catch (e: any) {
      toast({ title: "Could not create group", description: e?.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const filtered = groups.filter((g) =>
    !search || g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const myGroups = filtered.filter((g) => g.isMember);
  const discover = filtered.filter((g) => !g.isMember);

  return (
    <div className="page-gradient min-h-screen flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-pink-400/20 rounded-full floating-orb blur-xl" />
        <div className="absolute bottom-40 right-20 w-24 h-24 bg-purple-400/20 rounded-full floating-orb blur-lg" style={{ animationDelay: "2s" }} />
      </div>

      <div className="flex-1 overflow-y-auto relative z-10 pb-24">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="wedding-heading text-2xl rainbow-header flex items-center gap-2">
                <Users className="w-6 h-6" />
                Groups
              </h1>
              <p className="text-sm text-white/60 mt-0.5">Find your community</p>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 border-0"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search groups…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-violet-900/40 border-violet-400/30 text-white placeholder:text-white/40"
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-white/70">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading groups…
            </div>
          ) : (
            <>
              {/* My groups */}
              {myGroups.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold text-white/80">My groups</h2>
                  {myGroups.map((g) => (
                    <GroupCard
                      key={g.id}
                      group={g}
                      onJoin={handleJoin}
                      onLeave={handleLeave}
                      loading={joiningId === g.id}
                    />
                  ))}
                </section>
              )}

              {/* Discover */}
              {discover.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold text-white/80">Discover groups</h2>
                  {discover.map((g) => (
                    <GroupCard
                      key={g.id}
                      group={g}
                      onJoin={handleJoin}
                      onLeave={handleLeave}
                      loading={joiningId === g.id}
                    />
                  ))}
                </section>
              )}

              {filtered.length === 0 && (
                <div className="text-white/60 text-sm">No groups found. Be the first to create one!</div>
              )}
            </>
          )}
        </div>
      </div>

      <BottomNavigation />

      {/* Create group dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-violet-950 border-violet-400/30 text-white">
          <DialogHeader>
            <DialogTitle>Create a group</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Group name *"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              maxLength={60}
              className="bg-violet-900/40 border-violet-400/30 text-white"
            />
            <Textarea
              placeholder="Description (optional)"
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              maxLength={300}
              rows={3}
              className="bg-violet-900/40 border-violet-400/30 text-white resize-none"
            />
            <select
              value={newGroup.category}
              onChange={(e) => setNewGroup({ ...newGroup, category: e.target.value })}
              className="w-full p-2 rounded-md bg-violet-900/40 border border-violet-400/30 text-white text-sm"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={newGroup.privacy}
              onChange={(e) => setNewGroup({ ...newGroup, privacy: e.target.value })}
              className="w-full p-2 rounded-md bg-violet-900/40 border border-violet-400/30 text-white text-sm"
            >
              <option value="public">Public — anyone can join</option>
              <option value="private">Private — invite only</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-white/20 text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={!newGroup.name.trim() || creating}
              className="bg-gradient-to-r from-pink-500 to-purple-500 border-0"
            >
              {creating ? "Creating…" : "Create group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

type GroupCardProps = {
  group: Group;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  loading: boolean;
};

const GroupCard: React.FC<GroupCardProps> = ({ group, onJoin, onLeave, loading }) => (
  <Card className="bg-violet-950/80 border-violet-400/30 text-white">
    <CardContent className="p-3 flex items-center gap-3">
      {/* Icon / cover */}
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center shrink-0 text-2xl overflow-hidden">
        {group.cover_image ? (
          <img src={group.cover_image} alt={group.name} className="w-full h-full object-cover" />
        ) : (
          <Users className="w-6 h-6 text-pink-300" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm truncate">{group.name}</span>
          {group.privacy !== "public" && <Lock className="w-3 h-3 text-white/40 shrink-0" />}
          {group.isMember && (
            <Badge className="text-[10px] px-1.5 py-0 bg-pink-500/20 text-pink-200 border-pink-400/30">Joined</Badge>
          )}
        </div>
        {group.description && (
          <p className="text-xs text-white/60 truncate mt-0.5">{group.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-white/50">{group.member_count} members</span>
          <span className="text-[11px] text-white/30">·</span>
          <span className="text-[11px] text-white/50 capitalize">{CATEGORY_LABELS[group.category] ?? group.category}</span>
        </div>
      </div>

      <Button
        size="sm"
        onClick={() => group.isMember ? onLeave(group.id) : onJoin(group.id)}
        disabled={loading}
        variant={group.isMember ? "outline" : "default"}
        className={
          group.isMember
            ? "border-white/20 text-white/70 hover:bg-white/10 text-xs px-3"
            : "bg-gradient-to-r from-pink-500 to-purple-500 border-0 text-xs px-3"
        }
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : group.isMember ? "Leave" : "Join"}
      </Button>
    </CardContent>
  </Card>
);

export default GroupsPage;
