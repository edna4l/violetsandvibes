import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoginForm from '@/components/LoginForm';
import CreateAccountForm from '@/components/CreateAccountForm';
import { PasswordResetForm } from '@/components/PasswordResetForm';
import { authService, AuthUser } from '@/lib/auth';
import { getSafeRedirectPath } from '@/lib/redirect';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ResponsiveWrapper } from '@/components/ResponsiveWrapper';
import { useProfileStatus } from '@/hooks/useProfileStatus';
import { useToast } from '@/hooks/use-toast';
import { ShieldPlus, Heart, Users, Sparkles } from 'lucide-react';

const WomanSilhouette = () => (
  <svg viewBox="0 0 160 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="80" cy="95" r="72" fill="rgba(109,40,217,0.08)" />
    {/* Hair back */}
    <path d="M92 28 Q128 12 144 54 Q154 92 136 142 Q116 156 106 140 Q122 108 114 72 Q126 48 92 28Z" fill="rgba(109,40,217,0.55)" />
    {/* Head */}
    <ellipse cx="78" cy="66" rx="28" ry="34" fill="rgba(109,40,217,0.72)" />
    {/* Neck */}
    <rect x="66" y="95" width="24" height="20" rx="6" fill="rgba(109,40,217,0.72)" />
    {/* Shoulders */}
    <path d="M28 118 Q52 107 78 110 Q104 107 132 118 L134 158 Q78 164 26 158Z" fill="rgba(109,40,217,0.72)" />
    {/* Hair highlight */}
    <path d="M106 32 Q118 20 128 42 Q132 62 122 88 Q114 72 112 52Z" fill="rgba(139,92,246,0.35)" />
    {/* Flower on hair */}
    <circle cx="128" cy="48" r="8" fill="rgba(167,139,250,0.7)" />
    <circle cx="128" cy="48" r="4" fill="rgba(221,214,254,0.9)" />
    <circle cx="128" cy="48" r="1.5" fill="rgba(109,40,217,0.8)" />
    {/* Bottom flowers */}
    <circle cx="24" cy="158" r="11" fill="rgba(109,40,217,0.5)" />
    <circle cx="24" cy="158" r="5.5" fill="rgba(167,139,250,0.7)" />
    <circle cx="24" cy="158" r="2" fill="rgba(221,214,254,0.9)" />
    <circle cx="142" cy="162" r="9" fill="rgba(109,40,217,0.45)" />
    <circle cx="142" cy="162" r="4.5" fill="rgba(167,139,250,0.65)" />
    <circle cx="142" cy="162" r="1.5" fill="rgba(221,214,254,0.85)" />
    {/* Leaves */}
    <path d="M14 128 Q24 110 40 122 Q32 138 14 128Z" fill="rgba(109,40,217,0.45)" />
    <path d="M146 125 Q158 106 168 118 Q160 136 146 125Z" fill="rgba(109,40,217,0.4)" />
    <path d="M8 155 Q16 140 28 150 Q22 164 8 155Z" fill="rgba(109,40,217,0.38)" />
    {/* Stars */}
    <path d="M32 72 L33.5 77 L38 72 L33.5 67Z" fill="rgba(196,181,253,0.85)" />
    <path d="M148 82 L149 85.5 L152.5 82 L149 78.5Z" fill="rgba(196,181,253,0.75)" />
    <circle cx="18" cy="98" r="2" fill="rgba(196,181,253,0.65)" />
    <circle cx="156" cy="108" r="1.5" fill="rgba(196,181,253,0.55)" />
    <circle cx="48" cy="38" r="1.5" fill="rgba(196,181,253,0.75)" />
    <circle cx="112" cy="170" r="1.5" fill="rgba(196,181,253,0.5)" />
  </svg>
);

const SignInPage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('login');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { status } = useProfileStatus();
  const { toast } = useToast();

  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect');
  const redirectTarget = redirect && redirect.startsWith('/') ? redirect : '/social';
  const safeRedirectTarget = getSafeRedirectPath(redirectTarget, '/social');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = (params.get('tab') || '').toLowerCase();
    if (tabParam === 'register' || tabParam === 'signup' || tabParam === 'create') {
      setActiveTab('register');
      return;
    }
    if (tabParam === 'login' || tabParam === 'signin') {
      setActiveTab('login');
    }
  }, [location.search]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const socialError = params.get('social_error');
    if (!socialError) return;

    const provider = params.get('provider') || 'social provider';
    const humanReason = socialError.replace(/_/g, ' ');

    toast({
      title: `${provider} login failed`,
      description: humanReason,
      variant: 'destructive',
    });

    params.delete('social_error');
    params.delete('provider');
    const next = params.toString();
    const cleanUrl = `${location.pathname}${next ? `?${next}` : ''}`;
    window.history.replaceState({}, '', cleanUrl);
  }, [location.pathname, location.search, toast]);

  if (isLoading) {
    return (
      <div className="page-calm min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    if (status === "loading") {
      return (
        <div className="page-calm min-h-screen flex items-center justify-center">
          <div className="text-white/80">Checking your profile…</div>
        </div>
      );
    }

    if (status === "incomplete") {
      const next = encodeURIComponent(safeRedirectTarget);
      return <Navigate to={`/create-new-profile?redirect=${next}`} replace />;
    }

    return <Navigate to={safeRedirectTarget} replace />;
  }

  return (
    <div className="page-signin">

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative z-10">
        <ResponsiveWrapper maxWidth="2xl" className="h-full py-8 px-4">
          {/* Auth Forms */}
          <div className="flex justify-center">
            <div className="w-full max-w-xl rounded-[34px] border border-pink-200/30 bg-gradient-to-r from-fuchsia-500/25 via-indigo-500/20 to-pink-500/25 p-[1px] shadow-2xl">
              <Card className="relative overflow-hidden rounded-[32px] border border-white/20 bg-gradient-to-br from-[#2a124b]/95 via-[#3a1d5f]/95 to-[#4b2164]/95">
                <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-pink-300/15 blur-sm" />
                <div className="pointer-events-none absolute -bottom-16 right-4 h-40 w-40 rounded-full bg-indigo-300/20 blur-sm" />

                <div className="relative border-b border-white/15 p-6 sm:p-8">
                  {/* Two-column: illustration + title */}
                  <div className="flex items-center gap-5">
                    <div className="shrink-0 w-28 h-32 sm:w-36 sm:h-40">
                      <WomanSilhouette />
                    </div>
                    <div className="flex-1 space-y-3">
                      <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
                        Friendship, dating,{" "}
                        <span className="rainbow-header">and community with intention</span>
                      </h1>
                    </div>
                  </div>
                  {/* Sparkle divider */}
                  <div className="flex items-center gap-3 mt-5">
                    <div className="flex-1 h-px bg-white/10" />
                    <Sparkles className="w-3.5 h-3.5 text-white/30" />
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                </div>

                <CardHeader className="relative text-center pt-7 pb-2">
                  <CardTitle className="text-3xl sm:text-4xl text-white wedding-heading flex items-center justify-center gap-3">
                    {!showPasswordReset && <span className="text-violet-300/60 text-lg">🌿</span>}
                    {showPasswordReset ? 'Reset Password' : 'Join the Community'}
                    {!showPasswordReset && <span className="text-violet-300/60 text-lg">🌿</span>}
                  </CardTitle>
                  {showPasswordReset ? (
                    <CardDescription className="text-white/70">
                      Enter your email to reset your password
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="relative px-6 sm:px-10 pb-9">
                  {showPasswordReset ? (
                    <PasswordResetForm onBack={() => setShowPasswordReset(false)} />
                  ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-6 bg-purple-900/50">
                        <TabsTrigger value="login" className="text-white data-[state=active]:bg-purple-600">Sign In</TabsTrigger>
                        <TabsTrigger value="register" className="text-white data-[state=active]:bg-purple-600">Create Account</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="login">
                        <LoginForm onForgotPassword={() => setShowPasswordReset(true)} />
                      </TabsContent>
                      
                      <TabsContent value="register">
                        <CreateAccountForm />
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>

                <div className="relative border-t border-white/15 px-6 pb-6 pt-6 text-center sm:px-10">
                  {/* Sparkle divider */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-white/10" />
                    <Sparkles className="w-3 h-3 text-white/25" />
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  <p className="mx-auto max-w-md text-2xl sm:text-3xl font-bold rainbow-header wedding-title leading-tight">
                    Women-centered &middot; Inclusive &middot; Safety-first
                  </p>

                  {/* Icon row */}
                  <div className="mt-5 flex items-center justify-center gap-6 text-white/50">
                    <ShieldPlus className="w-6 h-6" />
                    <span className="text-white/20">+</span>
                    <Heart className="w-6 h-6" />
                    <span className="text-white/20">+</span>
                    <Users className="w-6 h-6" />
                    <span className="text-white/20">+</span>
                    <Sparkles className="w-6 h-6" />
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-white/60">
                    <Link className="hover:text-white/90 underline underline-offset-4" to="/privacy">
                      Privacy Policy
                    </Link>
                    <Link className="hover:text-white/90 underline underline-offset-4" to="/terms">
                      Terms of Service
                    </Link>
                    <Link className="hover:text-white/90 underline underline-offset-4" to="/data-deletion">
                      Data Deletion
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </ResponsiveWrapper>
      </div>
    </div>
  );
};

export default SignInPage;
