import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoginForm from '@/components/LoginForm';
import CreateAccountForm from '@/components/CreateAccountForm';
import { PasswordResetForm } from '@/components/PasswordResetForm';
import { authService, AuthUser } from '@/lib/auth';
import { getSafeRedirectPath } from '@/lib/redirect';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useProfileStatus } from '@/hooks/useProfileStatus';
import { useToast } from '@/hooks/use-toast';
import { UserRound, UserPlus } from 'lucide-react';

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
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

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
      <main className="signin-stage">
        <section className="signin-panel-overlay" aria-labelledby="signin-heading">
          <h1 id="signin-heading" className="sr-only">
            Join the Violets and Vibes community
          </h1>

          <div className="signin-controls">
            {showPasswordReset ? (
              <div className="signin-reset">
                <PasswordResetForm onBack={() => setShowPasswordReset(false)} />
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="signin-tabs">
                <TabsList className="signin-tabs-list">
                  <TabsTrigger value="login" className="signin-tab-trigger">
                    <UserRound aria-hidden="true" />
                    <span>Sign In</span>
                  </TabsTrigger>
                  <TabsTrigger value="register" className="signin-tab-trigger">
                    <UserPlus aria-hidden="true" />
                    <span>Create Account</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="signin-tab-content">
                  <LoginForm onForgotPassword={() => setShowPasswordReset(true)} />
                </TabsContent>

                <TabsContent value="register" className="signin-tab-content signin-register-content">
                  <CreateAccountForm />
                </TabsContent>
              </Tabs>
            )}
          </div>

          <nav className="signin-footer-links" aria-label="Legal">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/data-deletion">Data Deletion</Link>
          </nav>
        </section>
      </main>
    </div>
  );
};

export default SignInPage;
