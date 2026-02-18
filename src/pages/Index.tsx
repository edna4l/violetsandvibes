import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchDiscoverProfiles, type ProfileRow } from "@/lib/profiles";
import { DiscoverProfileCard } from "@/components/DiscoverProfileCard";

const Index: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDiscoverProfiles(user.id);
        setRows(data);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load profiles");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  return (
    <div className="page-calm min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-white text-2xl font-semibold mb-4">Discover</h1>

        {loading ? (
          <div className="text-white/70">Loading people…</div>
        ) : error ? (
          <div className="text-pink-200 bg-pink-900/20 border border-pink-400/30 rounded-md px-3 py-2">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-white/70">
            No profiles yet. Invite a friend or check back soon 💜
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rows.map((p) => (
              <DiscoverProfileCard key={p.id} profile={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
