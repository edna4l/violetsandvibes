import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function usePushRegistration() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;

    const register = async () => {
      try {
        const { receive } = await PushNotifications.requestPermissions();
        if (receive !== "granted") return;

        await PushNotifications.register();

        await PushNotifications.addListener("registration", async ({ value: token }) => {
          const platform = Capacitor.getPlatform() as string;
          await supabase.from("push_tokens").upsert(
            { user_id: user.id, token, platform },
            { onConflict: "user_id,token" }
          );
        });
      } catch {
        // Silently skip if unavailable
      }
    };

    void register();
  }, [user?.id]);
}
