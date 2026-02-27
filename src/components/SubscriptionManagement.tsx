import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, CreditCard, Crown, Star, Zap } from 'lucide-react';
import { SubscriptionTier, SUBSCRIPTION_TIER_LABELS } from '@/types/subscription';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionManagementProps {
  currentTier: SubscriptionTier;
  onUpgrade: () => void;
}

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  currentTier,
  onUpgrade
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const subscriptionData = {
    nextBillingDate: '2024-09-15',
    daysRemaining: 23,
    autoRenew: true,
    paymentMethod: '4242',
    usageStats: {
      superLikes: { used: 3, total: 5 },
      boosts: { used: 1, total: 3 },
      rewinds: { used: 7, total: 10 }
    }
  };

  const tierInfo = {
    free: { name: SUBSCRIPTION_TIER_LABELS.free, icon: <Zap className="w-5 h-5" />, color: 'bg-gray-100 text-gray-800' },
    premium: { name: SUBSCRIPTION_TIER_LABELS.premium, icon: <Star className="w-5 h-5" />, color: 'bg-blue-100 text-blue-800' },
    elite: { name: SUBSCRIPTION_TIER_LABELS.elite, icon: <Crown className="w-5 h-5" />, color: 'bg-purple-100 text-purple-800' }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will remain active until the next billing date.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {tierInfo[currentTier].icon}
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge className={tierInfo[currentTier].color}>
                {tierInfo[currentTier].name}
              </Badge>
              {currentTier !== 'free' && (
                <p className="text-sm text-gray-600 mt-1">
                  Renews on {subscriptionData.nextBillingDate}
                </p>
              )}
            </div>
            {currentTier === 'free' ? (
              <Button onClick={onUpgrade} className="bg-pink-500 hover:bg-pink-600">
                Upgrade Now
              </Button>
            ) : (
              <Button variant="outline" onClick={onUpgrade}>
                Change Plan
              </Button>
            )}
          </div>

          {currentTier !== 'free' && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {subscriptionData.daysRemaining} days remaining
                </span>
              </div>
              <Progress 
                value={(subscriptionData.daysRemaining / 30) * 100} 
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {currentTier !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(subscriptionData.usageStats).map(([key, stats]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{key}</span>
                  <span>{stats.used}/{stats.total}</span>
                </div>
                <Progress value={(stats.used / stats.total) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {currentTier !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Card ending in {subscriptionData.paymentMethod}</p>
                <p className="text-sm text-gray-600">Auto-renew enabled</p>
              </div>
              <Button variant="outline">
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentTier !== 'free' && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleCancelSubscription}
              disabled={isLoading}
            >
              {isLoading ? 'Cancelling...' : 'Cancel Subscription'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionManagement;
