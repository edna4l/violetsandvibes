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
    <div className="page-calm min-h-screen flex flex-col relative">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-pink-400/20 rounded-full floating-orb blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-400/20 rounded-full floating-orb blur-lg" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-40 left-20 w-28 h-28 bg-indigo-400/20 rounded-full floating-orb blur-xl" style={{animationDelay: '4s'}}></div>
        <div className="absolute bottom-20 right-10 w-20 h-20 bg-cyan-400/20 rounded-full floating-orb blur-lg" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative z-10">
        <ResponsiveWrapper maxWidth="2xl" className="h-full py-8 px-4">
          {/* Auth Forms */}
          <div className="flex justify-center">
            <div className="w-full max-w-xl rounded-[34px] border border-pink-200/30 bg-gradient-to-r from-fuchsia-500/25 via-indigo-500/20 to-pink-500/25 p-[1px] shadow-2xl">
              <Card className="relative overflow-hidden rounded-[32px] border border-white/20 bg-gradient-to-br from-[#2a124b]/95 via-[#3a1d5f]/95 to-[#4b2164]/95">
                <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-pink-300/15 blur-sm" />
                <div className="pointer-events-none absolute -bottom-16 right-4 h-40 w-40 rounded-full bg-indigo-300/20 blur-sm" />

                <div className="relative border-b border-white/15 p-6 sm:p-8 text-center">
                  <div className="mb-7 flex items-center gap-3">
                    <span className="h-2 flex-1 rounded-full bg-rose-400" />
                    <span className="h-2 flex-1 rounded-full bg-orange-400" />
                    <span className="h-2 flex-1 rounded-full bg-amber-300" />
                    <span className="h-2 flex-1 rounded-full bg-emerald-400" />
                    <span className="h-2 flex-1 rounded-full bg-sky-400" />
                    <span className="h-2 flex-1 rounded-full bg-indigo-400" />
                    <span className="h-2 flex-1 rounded-full bg-fuchsia-400" />
                  </div>

                  <h1 className="mx-auto max-w-md text-4xl sm:text-5xl font-bold rainbow-header wedding-title leading-tight">
                    Friendship, dating, and community with intention
                  </h1>
                </div>

                <CardHeader className="relative text-center pt-8">
                  <CardTitle className="text-3xl sm:text-4xl text-white wedding-heading">
                    {showPasswordReset ? 'Reset Password' : 'Join the Community'}
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

                <div className="relative border-t border-white/15 px-6 pb-6 pt-7 text-center sm:px-10">
                  <p className="mx-auto max-w-md text-4xl sm:text-5xl font-bold rainbow-header wedding-title leading-tight">
                    Women-centered &middot; Inclusive &middot; Safety-first
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm sm:text-base text-white/75">
                    <Link className="hover:text-white underline underline-offset-4" to="/privacy">
                      Privacy Policy
                    </Link>
                    <Link className="hover:text-white underline underline-offset-4" to="/terms">
                      Terms of Service
                    </Link>
                    <Link className="hover:text-white underline underline-offset-4" to="/data-deletion">
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
