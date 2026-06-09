import { useEffect, useState } from "react";

type UserLike = {
  id: string;
  likedUserId: string;
  createdAt: string;
  // add other fields returned by your edge function if needed
};

type Mode = "liked" | "likedMe"; 
// "liked" = users I liked, "likedMe" = users who liked me

export default function useUserLikes(mode: Mode = "liked") {
  const [likes, setLikes] = useState<UserLike[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLikes = async () => {
      setLoading(true);
      setError(null);

      try {
        const endpoint =
          mode === "liked" ? "/user-likes" : "/user-likes/liked-me";

        const res = await fetch(endpoint, {
          credentials: "include", // ensures auth cookies / headers are sent if required
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch ${mode} (status ${res.status})`);
        }

        const data = await res.json();
        setLikes(data ?? []);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchLikes();
  }, [mode]);

  return { likes, loading, error };
}
