import React, { useEffect, useMemo, useState } from 'react';
import { authService, CustomSocialProvider, SocialOAuthProvider } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Facebook, Instagram, Linkedin, Mail } from 'lucide-react';
import { useLocation } from 'react-router-dom';

type SocialLink = {
  label: string;
  shortLabel?: string;
  Icon?: React.ComponentType<{ className?: string }>;
  provider?: SocialOAuthProvider;
  customProvider?: CustomSocialProvider;
  href?: string;
};

type SupabaseExternalSettings = Partial<Record<string, boolean>>;

const SOCIAL_LINKS: SocialLink[] = [
  { label: 'LinkedIn', Icon: Linkedin, provider: 'linkedin_oidc' },
  { label: 'Instagram', Icon: Instagram, href: 'https://www.instagram.com' },
  { label: 'TikTok', shortLabel: 'TT', customProvider: 'tiktok' },
  { label: 'Lemon8', shortLabel: 'L8', href: 'https://www.lemon8-app.com' },
  { label: 'Facebook', Icon: Facebook, provider: 'facebook' },
  { label: 'Scoopz', shortLabel: 'SC', href: 'https://www.scoopzapp.com' },
  { label: 'Outlook', shortLabel: 'OL', provider: 'azure' },
  { label: 'X', shortLabel: 'X', provider: 'twitter' },
  { label: 'Snapchat', shortLabel: 'SN', customProvider: 'snapchat' },
  { label: 'Gmail', Icon: Mail, provider: 'google' },
];

export function SocialLoginButtons() {
  const location = useLocation();
  const { toast } = useToast();
  const redirectPath = `${location.pathname}${location.search || ''}`;
  const [externalSettings, setExternalSettings] = useState<SupabaseExternalSettings | null>(null);

  const providerSettingsKey = useMemo<Record<SocialOAuthProvider, string>>(
    () => ({
      google: 'google',
      facebook: 'facebook',
      linkedin_oidc: 'linkedin_oidc',
      twitter: 'twitter',
      azure: 'azure',
      github: 'github',
    }),
    []
  );

  useEffect(() => {
    const loadProviderSettings = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
        const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
        if (!supabaseUrl || !supabaseAnon) return;

        const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
          headers: { apikey: supabaseAnon },
        });
        if (!response.ok) return;

        const json = await response.json();
        setExternalSettings((json?.external ?? null) as SupabaseExternalSettings | null);
      } catch {
        setExternalSettings(null);
      }
    };

    void loadProviderSettings();
  }, []);

  const isProviderEnabled = (provider?: SocialOAuthProvider) => {
    if (!provider) return true;
    if (!externalSettings) return true;
    const settingsKey = providerSettingsKey[provider];
    return !!externalSettings?.[settingsKey];
  };

  const getAvailability = (link: SocialLink) => {
    if (link.customProvider) return 'login' as const;
    if (link.provider) return isProviderEnabled(link.provider) ? ('login' as const) : ('setup' as const);
    return 'link' as const;
  };

  const handleSocialAction = async (link: SocialLink) => {
    const availability = getAvailability(link);

    if (availability === 'setup' && link.provider) {
      toast({
        title: `${link.label} is not enabled`,
        description: `Enable ${link.label} in Supabase Dashboard -> Authentication -> Providers.`,
        variant: 'destructive',
      });
      return;
    }

    if (link.provider) {
      try {
        await authService.signInWithSocial(link.provider, redirectPath);
        return;
      } catch (error: any) {
        toast({
          title: 'Social login failed',
          description:
            error?.message ||
            `Could not sign in with ${link.label}. Make sure this provider is enabled in Supabase Auth.`,
          variant: 'destructive',
        });
        return;
      }
    }

    if (link.customProvider) {
      try {
        await authService.signInWithCustomSocial(link.customProvider, redirectPath);
        return;
      } catch (error: any) {
        toast({
          title: 'Social login failed',
          description:
            error?.message ||
            `Could not sign in with ${link.label}. Make sure this provider is configured.`,
          variant: 'destructive',
        });
        return;
      }
    }

    if (link.href) {
      window.open(link.href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/20" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-black/90 px-2 text-white/70">Or continue with</span>
        </div>
      </div>
      <div className="pt-1">
        <div className="text-[11px] uppercase tracking-wide text-white/65 mb-2 text-center">
          Continue with social
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 justify-items-center">
          {SOCIAL_LINKS.map((link) => (
            <div key={link.label} className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={() => void handleSocialAction(link)}
                aria-label={link.label}
                title={
                  getAvailability(link) === 'login'
                    ? `${link.label} login`
                    : getAvailability(link) === 'setup'
                      ? `${link.label} setup required`
                  : `${link.label} link`
                }
                className="relative h-8 w-8 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                {link.Icon ? (
                  <link.Icon className="h-3.5 w-3.5" />
                ) : (
                  <span className="text-[10px] font-semibold leading-none">
                    {link.shortLabel || link.label[0]}
                  </span>
                )}
                <span
                  className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-black/60 ${
                    getAvailability(link) === "login"
                      ? "bg-emerald-400"
                      : getAvailability(link) === "setup"
                        ? "bg-amber-400"
                        : "bg-white/45"
                  }`}
                />
              </button>
              <span
                className={`text-[9px] leading-none ${
                  getAvailability(link) === "login"
                    ? "text-emerald-200"
                    : getAvailability(link) === "setup"
                      ? "text-amber-200"
                      : "text-white/50"
                }`}
              >
                {getAvailability(link) === "login"
                  ? "Login"
                  : getAvailability(link) === "setup"
                    ? "Setup"
                    : "Link"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-white/55 text-center">
          Green dot = direct login. Amber dot = enable provider in Supabase. Gray dot = external link.
        </div>
      </div>
    </div>
  );
}
