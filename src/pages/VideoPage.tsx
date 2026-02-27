import React from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VideoChat from '@/components/VideoChat';
import { ResponsiveWrapper } from '@/components/ResponsiveWrapper';
import SubscriptionGate from '@/components/SubscriptionGate';
import { useAuth } from '@/hooks/useAuth';
import { loadEffectiveSubscriptionTierForUser } from '@/lib/subscriptionTier';
import { SUBSCRIPTION_FEATURES, SubscriptionTier } from '@/types/subscription';

const VideoPage: React.FC = () => {
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
        console.warn('Could not load subscription tier for video chat:', error);
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
      <div className="page-gradient min-h-screen flex items-center justify-center text-white/85">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking video access…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-gradient min-h-screen flex items-center justify-center px-4">
        <div className="glass-pride rounded-2xl p-6 w-full max-w-md">
          <p className="text-white/90 mb-4">Sign in to use video chat.</p>
          <button
            className="w-full rounded-md bg-pink-500 hover:bg-pink-600 text-white px-4 py-2"
            onClick={() => navigate('/signin?redirect=/video', { replace: true })}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!SUBSCRIPTION_FEATURES[tier].videoChat) {
    return (
      <div className="page-gradient min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <SubscriptionGate
            requiredTier="premium"
            currentTier={tier}
            featureName="Video Chat"
            onUpgrade={() => navigate('/subscription')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-gradient min-h-screen flex flex-col relative">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-pink-400/20 rounded-full floating-orb blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-400/20 rounded-full floating-orb blur-lg" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-40 left-20 w-28 h-28 bg-indigo-400/20 rounded-full floating-orb blur-xl" style={{animationDelay: '4s'}}></div>
        <div className="absolute bottom-20 right-10 w-20 h-20 bg-cyan-400/20 rounded-full floating-orb blur-lg" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative z-10">
        <ResponsiveWrapper maxWidth="2xl" className="h-full">
          <div className="glass-pride rounded-2xl overflow-hidden h-full">
            <VideoChat />
          </div>
        </ResponsiveWrapper>
      </div>
    </div>
  );
};

export default VideoPage;
