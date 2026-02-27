import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Zap } from 'lucide-react';
import {
  SubscriptionTier,
  SUBSCRIPTION_PRICES,
  SUBSCRIPTION_TIER_LABELS,
} from '@/types/subscription';

interface SubscriptionGateProps {
  requiredTier: SubscriptionTier;
  currentTier: SubscriptionTier;
  featureName: string;
  onUpgrade: (tier: SubscriptionTier) => void;
}

const SubscriptionGate: React.FC<SubscriptionGateProps> = ({
  requiredTier,
  currentTier,
  featureName,
  onUpgrade,
}) => {
  const tierIcons = {
    free: <Zap className="h-5 w-5" />,
    premium: <Star className="h-5 w-5" />,
    elite: <Crown className="h-5 w-5" />,
  };

  const tierColors = {
    free: 'bg-gray-100 text-gray-800',
    premium: 'bg-purple-100 text-purple-800',
    elite: 'bg-yellow-100 text-yellow-800',
  };

  if (currentTier === requiredTier || 
      (currentTier === 'elite') || 
      (currentTier === 'premium' && requiredTier !== 'elite')) {
    return null;
  }

  return (
    <Card className="border-2 border-dashed border-gray-300">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          {tierIcons[requiredTier]}
        </div>
        <CardTitle className="text-lg">Upgrade Required</CardTitle>
        <CardDescription>
          {featureName} is available with {' '}
          <Badge className={tierColors[requiredTier]}>
            {SUBSCRIPTION_TIER_LABELS[requiredTier]}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button 
          onClick={() => onUpgrade(requiredTier)}
          className="w-full"
          variant="default"
        >
          Upgrade to {SUBSCRIPTION_TIER_LABELS[requiredTier]}
          {requiredTier !== 'free' && (
            <span className="ml-2">
              ${SUBSCRIPTION_PRICES[requiredTier as keyof typeof SUBSCRIPTION_PRICES].monthly}/mo
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubscriptionGate;
