import { useEffect, useState, useCallback } from "react";

type UserLike = {
  id: string;
  likedUserId: string;
  createdAt: string;
};

export default function useLikedMe() {
  const [likes, setLikes] = useState<UserLike[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLikes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/user-likes/liked-me", { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch liked-me (status ${res.status})`);

      const data = await res.json();
      setLikes(data ?? []);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLikes();
  }, [fetchLikes]);

  return { likes, loading, error, refresh: fetchLikes };
}
