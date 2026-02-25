import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Crown, 
  Settings, 
  Bell, 
  Shield, 
  Eye, 
  CreditCard,
  User,
  LogOut,
  ChevronRight,
  Smartphone,
  Globe,
  Heart,
  MessageCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionTier } from '@/types/subscription';
import PaymentPreferences from '@/components/PaymentPreferences';
import SubscriptionManagement from '@/components/SubscriptionManagement';
import BillingHistory from '@/components/BillingHistory';
import PricingTiers from '@/components/PricingTiers';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/components/theme-provider';
import { applyAppPreferences, DEFAULT_APP_PREFERENCES, normalizeAppPreferences } from '@/lib/appPreferences';

const DEFAULT_SETTINGS = {
  notifications: {
    matches: true,
    messages: true,
    likes: false,
    events: true,
    marketing: false,
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
  },
  privacy: {
    showOnline: true,
    showDistance: true,
    showAge: true,
    profileDiscoverable: true,
    showReadReceipts: false,
    incognitoMode: false,
    hideFromSearch: false,
  },
  safety: {
    photoVerification: false,
    twoFactor: false,
    blockScreenshots: false,
    requireVerification: false,
    autoBlockSuspicious: true,
  },
  app: {
    ...DEFAULT_APP_PREFERENCES,
  },
  matching: {
    ageRange: [18, 35],
    maxDistance: 50,
    showMeOnPride: true,
    prioritizeVerified: false,
    hideAlreadySeen: true,
  },
} as const;

type SettingsState = {
  notifications: Record<keyof typeof DEFAULT_SETTINGS.notifications, boolean>;
  privacy: Record<keyof typeof DEFAULT_SETTINGS.privacy, boolean>;
  safety: Record<keyof typeof DEFAULT_SETTINGS.safety, boolean>;
  app: Record<keyof typeof DEFAULT_SETTINGS.app, boolean>;
  matching: {
    ageRange: [number, number];
    maxDistance: number;
    showMeOnPride: boolean;
    prioritizeVerified: boolean;
    hideAlreadySeen: boolean;
  };
};

const NOTIFICATION_ITEMS: Array<{ key: keyof SettingsState['notifications']; label: string }> = [
  { key: 'matches', label: 'Matches' },
  { key: 'messages', label: 'Messages' },
  { key: 'likes', label: 'Likes' },
  { key: 'events', label: 'Events' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'pushNotifications', label: 'Push Notifications' },
  { key: 'emailNotifications', label: 'Email Notifications' },
  { key: 'smsNotifications', label: 'SMS Notifications' },
];

const APP_PREFERENCE_ITEMS: Array<{ key: keyof SettingsState['app']; label: string }> = [
  { key: 'darkMode', label: 'Dark Mode' },
  { key: 'reducedMotion', label: 'Reduced Motion' },
  { key: 'highContrast', label: 'High Contrast' },
  { key: 'largeText', label: 'Large Text' },
  { key: 'autoPlayVideos', label: 'Auto Play Videos' },
  { key: 'soundEffects', label: 'Sound Effects' },
];

const PRIVACY_ITEMS: Array<{ key: keyof SettingsState['privacy']; label: string; description: string }> = [
  { key: 'showOnline', label: 'Show Online', description: 'Controls whether others can see you online in chat presence.' },
  { key: 'showDistance', label: 'Show Distance', description: 'Controls whether your location/distance is shown on discovery cards.' },
  { key: 'showAge', label: 'Show Age', description: 'Controls whether your age is shown on discovery cards.' },
  { key: 'profileDiscoverable', label: 'Profile Discoverable', description: 'If off, your profile is hidden from discovery.' },
  { key: 'showReadReceipts', label: 'Show Read Receipts', description: 'Saved setting for chat read receipt behavior.' },
  { key: 'incognitoMode', label: 'Incognito Mode', description: 'Hides your profile from discovery while enabled.' },
  { key: 'hideFromSearch', label: 'Hide From Search', description: 'Removes your profile from discovery/search lists.' },
];

const SAFETY_ITEMS: Array<{ key: keyof SettingsState['safety']; label: string; description: string }> = [
  { key: 'photoVerification', label: 'Photo Verification', description: 'Marks your profile as photo-verified for matching priority filters.' },
  { key: 'twoFactor', label: 'Two Factor', description: 'Saved security preference for account hardening.' },
  { key: 'blockScreenshots', label: 'Block Screenshots', description: 'Saved preference. Enforcement depends on platform support.' },
  { key: 'requireVerification', label: 'Require Verification', description: 'Only show photo-verified profiles in discovery.' },
  { key: 'autoBlockSuspicious', label: 'Auto Block Suspicious', description: 'Saved moderation preference for future enforcement hooks.' },
];

const createDefaultSettings = (): SettingsState => ({
  notifications: { ...DEFAULT_SETTINGS.notifications },
  privacy: { ...DEFAULT_SETTINGS.privacy },
  safety: { ...DEFAULT_SETTINGS.safety },
  app: { ...DEFAULT_SETTINGS.app },
  matching: { ...DEFAULT_SETTINGS.matching },
});

function mergeBooleanSettings<T extends Record<string, boolean>>(defaults: T, source: Record<string, any>) {
  const merged = { ...defaults };
  (Object.keys(defaults) as Array<keyof T>).forEach((key) => {
    const candidate = source?.[key as string];
    if (typeof candidate === 'boolean') merged[key] = candidate;
  });
  return merged;
}

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { setTheme } = useTheme();
  
  // Mock subscription state - would come from context/database
  const [currentTier] = useState<SubscriptionTier>('free');
  
  const [settings, setSettings] = useState<SettingsState>(() => createDefaultSettings());
  const [loadingGeneral, setLoadingGeneral] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isHydrated, setIsHydrated] = useState(false);
  const persistTimerRef = useRef<number | null>(null);
  const basePrivacyRef = useRef<Record<string, any>>({});
  const baseSafetyRef = useRef<Record<string, any>>({});

  const handleUpgrade = () => {
    navigate('/subscription');
  };

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      if (!user?.id) {
        setSettings(createDefaultSettings());
        setLoadingGeneral(false);
        setIsHydrated(false);
        setSaveStatus('idle');
        return;
      }

      setLoadingGeneral(true);
      setSaveStatus('idle');

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('privacy_settings, safety_settings')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        const privacySettings = (data?.privacy_settings && typeof data.privacy_settings === 'object')
          ? (data.privacy_settings as Record<string, any>)
          : {};
        const safetySettings = (data?.safety_settings && typeof data.safety_settings === 'object')
          ? (data.safety_settings as Record<string, any>)
          : {};

        basePrivacyRef.current = privacySettings;
        baseSafetyRef.current = safetySettings;

        const next = createDefaultSettings();
        next.notifications = mergeBooleanSettings(next.notifications, privacySettings.notifications || {});
        next.privacy = mergeBooleanSettings(next.privacy, privacySettings);
        next.safety = mergeBooleanSettings(next.safety, safetySettings);
        next.app = normalizeAppPreferences(privacySettings.app || {});
        next.matching = {
          ...next.matching,
          ...(privacySettings.matching || {}),
        };

        if (!Array.isArray(next.matching.ageRange) || next.matching.ageRange.length !== 2) {
          next.matching.ageRange = [...DEFAULT_SETTINGS.matching.ageRange] as [number, number];
        }
        if (typeof next.matching.maxDistance !== 'number') {
          next.matching.maxDistance = DEFAULT_SETTINGS.matching.maxDistance;
        }

        setSettings(next);
        setIsHydrated(true);
      } catch (err: any) {
        console.error('Failed to load settings:', err);
        if (!cancelled) {
          setSettings(createDefaultSettings());
          setIsHydrated(true);
          setSaveStatus('error');
          toast({
            title: 'Settings load issue',
            description: err?.message || 'Could not load saved settings.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoadingGeneral(false);
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [user?.id, toast]);

  useEffect(() => {
    if (!user?.id || !isHydrated || loadingGeneral) return;

    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);

    setSaveStatus('saving');
    persistTimerRef.current = window.setTimeout(async () => {
      try {
        const privacyPayload = {
          ...basePrivacyRef.current,
          ...settings.privacy,
          notifications: settings.notifications,
          app: settings.app,
          matching: settings.matching,
        };
        const safetyPayload = {
          ...baseSafetyRef.current,
          ...settings.safety,
        };

        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            privacy_settings: privacyPayload,
            safety_settings: safetyPayload,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;

        basePrivacyRef.current = privacyPayload;
        baseSafetyRef.current = safetyPayload;
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save settings:', err);
        setSaveStatus('error');
      }
    }, 450);

    return () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, [settings, user?.id, isHydrated, loadingGeneral]);

  useEffect(() => {
    if (!isHydrated) return;
    applyAppPreferences(settings.app, setTheme);
  }, [settings.app, setTheme, isHydrated]);

  const updateNotificationSetting = (key: keyof SettingsState['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
  };

  const updatePrivacySetting = (key: keyof SettingsState['privacy'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value }
    }));
  };

  const updateSafetySetting = (key: keyof SettingsState['safety'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      safety: { ...prev.safety, [key]: value }
    }));
  };

  const updateAppSetting = (key: keyof SettingsState['app'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      app: { ...prev.app, [key]: value }
    }));
  };

  const updateMatchingSetting = (key: 'showMeOnPride' | 'prioritizeVerified' | 'hideAlreadySeen', value: boolean) => {
    setSettings(prev => ({
      ...prev,
      matching: { ...prev.matching, [key]: value }
    }));
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
      navigate('/signin');
    }
  };

  const formatSettingName = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-sm text-gray-600 mt-1">
              {loadingGeneral
                ? 'Loading settings...'
                : saveStatus === 'saving'
                ? 'Saving changes...'
                : saveStatus === 'saved'
                ? 'All changes saved'
                : saveStatus === 'error'
                ? 'Save issue. Changes may not persist.'
                : 'Changes save automatically'}
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Done
          </Button>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {NOTIFICATION_ITEMS.map(({ key, label }) => (
                  <div key={key} className="flex justify-between items-center">
                    <span>{label}</span>
                    <Switch 
                      checked={settings.notifications[key]}
                      onCheckedChange={(checked) => updateNotificationSetting(key, checked)}
                      disabled={loadingGeneral}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* App Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  App Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {APP_PREFERENCE_ITEMS.map(({ key, label }) => (
                  <div key={key} className="flex justify-between items-center">
                    <span>{label}</span>
                    <Switch 
                      checked={settings.app[key]}
                      onCheckedChange={(checked) => updateAppSetting(key, checked)}
                      disabled={loadingGeneral}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Matching Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Matching Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(settings.matching).filter(([key]) => typeof settings.matching[key as keyof SettingsState['matching']] === 'boolean').map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span>{formatSettingName(key)}</span>
                    <Switch 
                      checked={Boolean(value)}
                      onCheckedChange={(checked) => updateMatchingSetting(key as 'showMeOnPride' | 'prioritizeVerified' | 'hideAlreadySeen', checked)}
                      disabled={loadingGeneral}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Privacy Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {PRIVACY_ITEMS.map(({ key, label, description }) => (
                  <div key={key} className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div>{label}</div>
                      <div className="text-xs text-gray-600">{description}</div>
                    </div>
                    <Switch 
                      checked={settings.privacy[key]}
                      onCheckedChange={(checked) => updatePrivacySetting(key, checked)}
                      disabled={loadingGeneral}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Safety & Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Safety & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {SAFETY_ITEMS.map(({ key, label, description }) => (
                  <div key={key} className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div>{label}</div>
                      <div className="text-xs text-gray-600">{description}</div>
                    </div>
                    <Switch 
                      checked={settings.safety[key]}
                      onCheckedChange={(checked) => updateSafetySetting(key, checked)}
                      disabled={loadingGeneral}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            {/* Subscription Management */}
            <SubscriptionManagement 
              currentTier={currentTier}
              onUpgrade={handleUpgrade}
            />

            {/* Billing History */}
            <BillingHistory />

            {/* Pricing Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Available Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <PricingTiers 
                  currentTier={currentTier}
                  onTierSelect={(tier, period) => {
                    console.log('Selected tier:', tier, period);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-between h-auto py-3 px-2" 
                  onClick={() => navigate('/edit-profile')}
                >
                  <div className="text-left">
                    <div>Edit Profile</div>
                    <div className="text-xs text-gray-600">Update photos, bio, and profile details.</div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between h-auto py-3 px-2"
                  onClick={() => navigate('/verification')}
                >
                  <div className="text-left">
                    <div>Verification</div>
                    <div className="text-xs text-gray-600">Manage your identity and photo verification status.</div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between h-auto py-3 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    const confirmed = window.confirm(
                      'Are you sure? Account deletion is not yet available from settings.'
                    );
                    if (!confirmed) return;
                    toast({
                      title: 'Coming Soon',
                      description: 'Account deletion will be available soon.',
                    });
                  }}
                >
                  <div className="text-left">
                    <div>Delete Account</div>
                    <div className="text-xs text-red-500/80">Permanent action. This cannot be undone.</div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Sign Out */}
            <Card>
              <CardContent className="pt-6">
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
