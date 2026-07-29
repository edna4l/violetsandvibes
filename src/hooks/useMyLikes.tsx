import { useEffect, useState, useCallback } from "react";

type UserLike = {
  id: string;
  likedUserId: string;
  createdAt: string;
};

export default function useMyLikes() {
  const [likes, setLikes] = useState<UserLike[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLikes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/user-likes", { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch likes (status ${res.status})`);

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

  const likeUser = useCallback(
    async (likedUserId: string) => {
      try {
        const res = await fetch("/user-likes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ likedUserId }),
        });

        if (!res.ok) throw new Error(`Failed to like user (status ${res.status})`);

        await fetchLikes();
      } catch (err: any) {
        setError(err.message || "Unknown error");
      }
    },
    [fetchLikes]
  );

  const unlikeUser = useCallback(async (likedUserId: string) => {
    try {
      const res = await fetch(`/user-likes/${likedUserId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Failed to unlike user (status ${res.status})`);

      setLikes((prev) => prev.filter((like) => like.likedUserId !== likedUserId));
    } catch (err: any) {
      setError(err.message || "Unknown error");
    }
  }, []);

  return { likes, loading, error, likeUser, unlikeUser, refresh: fetchLikes };
}
