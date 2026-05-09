import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type StreakState = {
  currentStreak: number;
  longestStreak: number;
  loading: boolean;
};

export function useStreak(): StreakState {
  const { user } = useAuth();
  const [state, setState] = useState<StreakState>({
    currentStreak: 0,
    longestStreak: 0,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({ currentStreak: 0, longestStreak: 0, loading: false });
      return;
    }

    const tick = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);

        const { data: row, error } = await supabase
          .from("user_streaks")
          .select("current_streak, longest_streak, last_active_date")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (!row) {
          // First ever login
          await supabase.from("user_streaks").insert({
            user_id: user.id,
            current_streak: 1,
            longest_streak: 1,
            last_active_date: today,
          });
          setState({ currentStreak: 1, longestStreak: 1, loading: false });
          return;
        }

        const last = row.last_active_date as string | null;
        let current = row.current_streak as number;
        let longest = row.longest_streak as number;

        if (last === today) {
          // Already counted today
          setState({ currentStreak: current, longestStreak: longest, loading: false });
          return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        if (last === yesterdayStr) {
          current += 1;
        } else {
          current = 1; // streak broken
        }

        longest = Math.max(longest, current);

        await supabase.from("user_streaks").upsert({
          user_id: user.id,
          current_streak: current,
          longest_streak: longest,
          last_active_date: today,
          streak_updated_at: new Date().toISOString(),
        });

        // Update last_active_at on profile too
        await supabase
          .from("profiles")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", user.id);

        setState({ currentStreak: current, longestStreak: longest, loading: false });
      } catch (e) {
        console.warn("useStreak error:", e);
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    void tick();
  }, [user?.id]);

  return state;
}
