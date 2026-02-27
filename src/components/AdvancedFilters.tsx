import React, { useEffect, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import SubscriptionGate from '@/components/SubscriptionGate';
import { Loader2 } from 'lucide-react';
import { SubscriptionTier } from '@/types/subscription';
import { loadEffectiveSubscriptionTierForUser } from '@/lib/subscriptionTier';
import {
  DEFAULT_DISCOVER_FILTERS,
  type DiscoverFilters,
  loadDiscoverFilters,
  saveDiscoverFilters,
} from '@/lib/discoverFilters';

const AdvancedFilters: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [filters, setFilters] = useState<DiscoverFilters>(DEFAULT_DISCOVER_FILTERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [tierLoading, setTierLoading] = useState(true);

  const interestOptions = ['Art', 'Music', 'Travel', 'Books', 'Sports', 'Cooking', 'Gaming', 'Photography', 'Dancing', 'Hiking'];
  const pronounOptions = ['She/Her', 'They/Them', 'He/Him', 'Any'];
  const relationshipOptions = ['Casual', 'Serious', 'Friends', 'Networking'];

  useEffect(() => {
    let cancelled = false;

    const loadTier = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setTier('free');
          setTierLoading(false);
        }
        return;
      }

      try {
        setTierLoading(true);
        const currentTier = await loadEffectiveSubscriptionTierForUser(user.id);
        if (!cancelled) setTier(currentTier);
      } catch (error) {
        console.warn('Failed to load subscription tier for advanced filters:', error);
        if (!cancelled) setTier('free');
      } finally {
        if (!cancelled) setTierLoading(false);
      }
    };

    const run = async () => {
      if (!user?.id) {
        setFilters(DEFAULT_DISCOVER_FILTERS);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const loaded = await loadDiscoverFilters(user.id);
        if (!cancelled) {
          setFilters(loaded);
        }
      } catch (error) {
        console.error('Failed to load discover filters:', error);
        if (!cancelled) {
          setFilters(DEFAULT_DISCOVER_FILTERS);
          toast({
            title: 'Could not load filters',
            description: 'Using default values for now.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadTier();
    void run();

    return () => {
      cancelled = true;
    };
  }, [user?.id, toast]);

  const toggleSelection = (item: string, list: string[], setter: (list: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter(i => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const togglePronoun = (item: string) => {
    setFilters((prev) => {
      if (item === 'Any') {
        return { ...prev, pronouns: ['Any'] };
      }

      const withoutAny = prev.pronouns.filter((p) => p !== 'Any');
      const exists = withoutAny.includes(item as any);
      const next = exists
        ? withoutAny.filter((p) => p !== item)
        : [...withoutAny, item as any];

      return {
        ...prev,
        pronouns: next.length > 0 ? (next as any) : ['Any'],
      };
    });
  };

  const applyFilters = async () => {
    if (!user?.id) {
      navigate('/signin?redirect=/filters', { replace: true });
      return;
    }

    try {
      setSaving(true);
      await saveDiscoverFilters(user.id, filters);
      toast({
        title: 'Filters applied',
        description: 'Discover results updated.',
      });
      navigate('/discover');
    } catch (error: any) {
      console.error('Failed to save filters:', error);
      toast({
        title: 'Could not apply filters',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (tierLoading) {
    return (
      <div className="p-6 text-white/80 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking subscription…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card className="bg-black/90 backdrop-blur-sm text-white border-pink-200">
          <CardContent className="pt-6 space-y-3">
            <p>Sign in to use advanced filters.</p>
            <Button
              onClick={() => navigate('/signin?redirect=/filters', { replace: true })}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tier === 'free') {
    return (
      <div className="p-6">
        <SubscriptionGate
          requiredTier="premium"
          currentTier={tier}
          featureName="Advanced Filters"
          onUpgrade={() => navigate('/subscription')}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <Card className="bg-black/90 backdrop-blur-sm text-white border-pink-200">
        <CardHeader>
          <CardTitle className="text-2xl bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">
            Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Age Range */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Age Range: {filters.ageRange[0]} - {filters.ageRange[1]}
            </label>
            <Slider
              value={filters.ageRange}
              onValueChange={(range) => setFilters((prev) => ({ ...prev, ageRange: [range[0], range[1]] }))}
              max={65}
              min={18}
              step={1}
              className="w-full"
              disabled={loading || saving}
            />
          </div>

          {/* Distance */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Distance: {filters.distanceMiles} miles
            </label>
            <Slider
              value={[filters.distanceMiles]}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, distanceMiles: value[0] ?? prev.distanceMiles }))}
              max={100}
              min={1}
              step={1}
              className="w-full"
              disabled={loading || saving}
            />
          </div>

          {/* Interests */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Interests</label>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map(interest => (
                <Badge
                  key={interest}
                  variant={filters.interests.includes(interest) ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${
                    filters.interests.includes(interest) 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600' 
                      : 'hover:bg-white/10 text-white border-white/30'
                  }`}
                  onClick={() =>
                    toggleSelection(interest, filters.interests, (next) =>
                      setFilters((prev) => ({ ...prev, interests: next }))
                    )
                  }
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>

          {/* Pronouns */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Pronouns</label>
            <div className="flex flex-wrap gap-2">
              {pronounOptions.map(pronoun => (
                <Badge
                  key={pronoun}
                  variant={filters.pronouns.includes(pronoun as any) ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${
                    filters.pronouns.includes(pronoun as any) 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600' 
                      : 'hover:bg-white/10 text-white border-white/30'
                  }`}
                  onClick={() => togglePronoun(pronoun)}
                >
                  {pronoun}
                </Badge>
              ))}
            </div>
          </div>

          {/* Relationship Type */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Looking For</label>
            <div className="flex flex-wrap gap-2">
              {relationshipOptions.map(type => (
                <Badge
                  key={type}
                  variant={filters.lookingFor.includes(type as any) ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${
                    filters.lookingFor.includes(type as any) 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600' 
                      : 'hover:bg-white/10 text-white border-white/30'
                  }`}
                  onClick={() =>
                    toggleSelection(type, filters.lookingFor, (next) =>
                      setFilters((prev) => ({ ...prev, lookingFor: next as any }))
                    )
                  }
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            disabled={loading || saving}
            onClick={applyFilters}
          >
            {saving ? 'Applying...' : 'Apply Filters'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedFilters;
