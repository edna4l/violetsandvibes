import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveSubscriptionTier } from "@/lib/subscriptionTier";
import { useNavigate } from "react-router-dom";

type ActiveBoost = {
  expires_at: string;
  views_during_boost: number;
};

const BoostPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeBoost, setActiveBoost] = useState<ActiveBoost | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [tier, setTier] = useState("free");
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const resolvedTier = await resolveSubscriptionTier(user.id);
      setTier(resolvedTier);

      const { data } = await supabase
        .from("profile_boosts")
        .select("expires_at, views_during_boost")
        .eq("user_id", user.id)
        .gte("expires_at", new Date().toISOString())
        .order("activated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setActiveBoost(data ?? null);
      setLoading(false);
    };
    void load();
  }, [user?.id]);

  // Countdown timer
  useEffect(() => {
    if (!activeBoost) return;
    const tick = () => {
      const ms = new Date(activeBoost.expires_at).getTime() - Date.now();
      if (ms <= 0) {
        setActiveBoost(null);
        setTimeLeft("");
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeBoost]);

  const handleActivate = async () => {
    if (!user) return;
    if (tier === "free" || tier === "premium") {
      toast({ title: "Boost is an Elite feature", description: "Upgrade to Elite to activate a profile boost." });
      navigate("/subscription");
      return;
    }
    setActivating(true);
    try {
      const { data, error } = await supabase
        .from("profile_boosts")
        .insert({ user_id: user.id })
        .select("expires_at, views_during_boost")
        .single();
      if (error) throw error;
      setActiveBoost(data);
      toast({ title: "🚀 Boost activated!", description: "Your profile is prioritized for the next 30 minutes." });
    } catch (e: any) {
      toast({ title: "Could not activate boost", description: e?.message, variant: "destructive" });
    } finally {
      setActivating(false);
    }
  };

  if (loading) return null;

  return (
    <div className={`rounded-xl border p-3 flex items-center gap-3 ${
      activeBoost
        ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30"
        : "bg-white/5 border-white/10"
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        activeBoost ? "bg-yellow-400/20" : "bg-white/10"
      }`}>
        <Zap className={`w-5 h-5 ${activeBoost ? "text-yellow-300" : "text-white/50"}`} />
      </div>
      <div className="flex-1 min-w-0">
        {activeBoost ? (
          <>
            <div className="text-sm font-semibold text-yellow-300">Boost active</div>
            <div className="text-xs text-white/60">{timeLeft} left · {activeBoost.views_during_boost} views</div>
          </>
        ) : (
          <>
            <div className="text-sm font-semibold text-white">Profile Boost</div>
            <div className="text-xs text-white/50">Be seen by more people for 30 min</div>
          </>
        )}
      </div>
      {!activeBoost && (
        <Button
          size="sm"
          onClick={() => void handleActivate()}
          disabled={activating}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-semibold border-0 text-xs"
        >
          {activating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Boost"}
        </Button>
      )}
    </div>
  );
};

export default BoostPanel;
