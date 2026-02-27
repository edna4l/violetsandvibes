import React from 'react';
import AdvancedFilters from '@/components/AdvancedFilters';

import { ResponsiveWrapper } from '@/components/ResponsiveWrapper';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionTier } from '@/types/subscription';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import SubscriptionGate from '@/components/SubscriptionGate';
import { loadEffectiveSubscriptionTierForUser } from '@/lib/subscriptionTier';

const FiltersPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tier, setTier] = React.useState<SubscriptionTier>('free');
  const [tierLoading, setTierLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setTier('free');
          setTierLoading(false);
        }
        return;
      }

      try {
        setTierLoading(true);
        const nextTier = await loadEffectiveSubscriptionTierForUser(user.id);
        if (!cancelled) setTier(nextTier);
      } catch (error) {
        console.warn('Could not load subscription tier for filters:', error);
        if (!cancelled) setTier('free');
      } finally {
        if (!cancelled) setTierLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (authLoading || tierLoading) {
    return (
      <div className="page-calm min-h-screen flex items-center justify-center text-white/80">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking access…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-calm min-h-screen flex items-center justify-center px-4">
        <div className="glass-pride rounded-2xl p-6 w-full max-w-md">
          <p className="text-white/85 mb-4">Sign in to use advanced filters.</p>
          <button
            className="w-full rounded-md bg-pink-500 hover:bg-pink-600 text-white px-4 py-2"
            onClick={() => navigate('/signin?redirect=/filters', { replace: true })}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (tier === 'free') {
    return (
      <div className="page-calm min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <SubscriptionGate
            requiredTier="premium"
            currentTier={tier}
            featureName="Advanced Filters"
            onUpgrade={() => navigate('/subscription')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-calm min-h-screen flex flex-col relative">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative z-10">
        <ResponsiveWrapper maxWidth="2xl" className="h-full">
          <div className="glass-pride rounded-2xl overflow-hidden">
            <AdvancedFilters />
          </div>
        </ResponsiveWrapper>
      </div>
    </div>
  );
};
export default FiltersPage;
