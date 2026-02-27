import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { SUBSCRIPTION_FEATURES } from '@/types/subscription';
import type { SubscriptionTier } from '@/types/subscription';
import { loadEffectiveSubscriptionTierForUser } from '@/lib/subscriptionTier';

interface SwipeData {
  date: string;
  count: number;
}

export const useSwipeLimit = () => {
  const { user } = useAuth();
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [dailySwipes, setDailySwipes] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadTier = async () => {
      if (!user?.id) {
        setCurrentTier('free');
        return;
      }

      try {
        const tier = await loadEffectiveSubscriptionTierForUser(user.id);
        if (!cancelled) setCurrentTier(tier);
      } catch (error) {
        console.warn('Could not load subscription tier for swipe limits:', error);
        if (!cancelled) setCurrentTier('free');
      }
    };

    void loadTier();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const features = SUBSCRIPTION_FEATURES[currentTier];
  const dailyLimit = features.dailySwipeLimit;

  useEffect(() => {
    if (!user) return;

    const today = new Date().toDateString();
    const stored = localStorage.getItem(`swipes_${user.id}`);
    
    if (stored) {
      const swipeData: SwipeData = JSON.parse(stored);
      if (swipeData.date === today) {
        setDailySwipes(swipeData.count);
        setIsLimitReached(dailyLimit > 0 && swipeData.count >= dailyLimit);
      } else {
        // New day, reset count
        setDailySwipes(0);
        setIsLimitReached(false);
        localStorage.setItem(`swipes_${user.id}`, JSON.stringify({
          date: today,
          count: 0
        }));
      }
    } else {
      localStorage.setItem(`swipes_${user.id}`, JSON.stringify({
        date: today,
        count: 0
      }));
    }
  }, [user, dailyLimit]);

  const incrementSwipe = () => {
    if (!user || (dailyLimit > 0 && dailySwipes >= dailyLimit)) return false;

    const newCount = dailySwipes + 1;
    const today = new Date().toDateString();
    
    setDailySwipes(newCount);
    setIsLimitReached(dailyLimit > 0 && newCount >= dailyLimit);
    
    localStorage.setItem(`swipes_${user.id}`, JSON.stringify({
      date: today,
      count: newCount
    }));

    return true;
  };

  const getRemainingSwipes = () => {
    if (dailyLimit === -1) return -1; // Unlimited
    return Math.max(0, dailyLimit - dailySwipes);
  };

  return {
    dailySwipes,
    isLimitReached,
    remainingSwipes: getRemainingSwipes(),
    incrementSwipe,
    isUnlimited: dailyLimit === -1
  };
};
