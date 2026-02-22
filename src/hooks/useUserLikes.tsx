import { useEffect, useState } from "react";

type UserLike = {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: string;
};

export default function useUserLikes(userId: string | undefined) {
  const [likes, setLikes] = useState<UserLike[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchLikes = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/users/${userId}/likes`);
        if (!res.ok) {
          throw new Error(`Failed to fetch likes (status ${res.status})`);
        }

        const data = await res.json();
        setLikes(data.likes ?? []);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchLikes();
  }, [userId]);

  return { likes, loading, error };
}
