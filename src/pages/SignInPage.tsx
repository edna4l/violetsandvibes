import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoginForm from '@/components/LoginForm';
import CreateAccountForm from '@/components/CreateAccountForm';
import { PasswordResetForm } from '@/components/PasswordResetForm';
import { authService, AuthUser } from '@/lib/auth';
import { getSafeRedirectPath } from '@/lib/redirect';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useProfileStatus } from '@/hooks/useProfileStatus';
import { useToast } from '@/hooks/use-toast';
import { StarCanvas } from '@/components/StarCanvas';

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
    const p = new URLSearchParams(location.search);
    const tab = (p.get('tab') || '').toLowerCase();
    if (tab === 'register' || tab === 'signup' || tab === 'create') setActiveTab('register');
    else if (tab === 'login' || tab === 'signin') setActiveTab('login');
  }, [location.search]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch {
        // not signed in
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
    const { data: { subscription } } = authService.onAuthStateChange((u) => {
      setUser(u); setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const socialError = p.get('social_error');
    if (!socialError) return;
    const provider = p.get('provider') || 'social provider';
    toast({ title: `${provider} login failed`, description: socialError.replace(/_/g, ' '), variant: 'destructive' });
    p.delete('social_error'); p.delete('provider');
    const next = p.toString();
    window.history.replaceState({}, '', `${location.pathname}${next ? `?${next}` : ''}`);
  }, [location.pathname, location.search, toast]);

  if (isLoading) {
    return (
      <div className="vv-page vv-signin-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-[#a78bfa] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[#a29dc4] text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (user) {
    if (status === 'loading') {
      return (
        <div className="vv-page vv-signin-page flex items-center justify-center">
          <p className="text-[#a29dc4]">Checking your profile…</p>
        </div>
      );
    }
    if (status === 'incomplete') {
      return <Navigate to={`/create-new-profile?redirect=${encodeURIComponent(safeRedirectTarget)}`} replace />;
    }
    return <Navigate to={safeRedirectTarget} replace />;
  }

  return (
    <div className="vv-page vv-signin-page">
      <StarCanvas />

      {/* Floral left panel */}
      <div aria-hidden className="vv-floral-panel vv-floral-panel-left">
        <img src="/vv-floral-left.png" alt="" />
        <div className="vv-floral-overlay" />
      </div>

      {/* Decorative hearts */}
      <div aria-hidden className="vv-deco-heart vv-signin-h1">💜</div>
      <div aria-hidden className="vv-deco-heart vv-signin-h2">🤍</div>
      <div aria-hidden className="vv-deco-heart vv-signin-h3">💜</div>

      {/* Rainbow bar */}
      <div aria-hidden className="vv-rainbow-bar" />

      {/* Compact header */}
      <header className="vv-header">
        <Link to="/terms#community-standards" className="vv-safety-badge">
          <div aria-hidden className="vv-shield-icon" />
          Safety Standards
        </Link>
        <h1 className="vv-brand-title">Violets &amp; Vibes</h1>
        <div className="w-20" />
      </header>

      {/* Auth card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-[5]">
        <div className="vv-signin-card w-full max-w-md">
          {/* Illustration row */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <img
              src="/vv-signin-moon-crystal.png"
              alt=""
              className="h-24 w-auto object-contain opacity-90"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <img
              src="/vv-signin-avatar.png"
              alt=""
              className="h-28 w-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>

          <div className="text-center mb-6">
            <h2 className="vv-signin-heading">
              {showPasswordReset ? 'Reset Password' : 'Join the Community'}
            </h2>
            <p className="vv-signin-tagline">
              Friendship, dating, and community with intention
            </p>
          </div>

          {showPasswordReset ? (
            <PasswordResetForm onBack={() => setShowPasswordReset(false)} />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 vv-tabs-list">
                <TabsTrigger value="login" className="vv-tab-trigger">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="vv-tab-trigger">Create Account</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm onForgotPassword={() => setShowPasswordReset(true)} />
              </TabsContent>
              <TabsContent value="register">
                <CreateAccountForm />
              </TabsContent>
            </Tabs>
          )}

          {/* Footer values */}
          <div className="vv-signin-footer">
            <div className="vv-signin-divider" />
            <p className="vv-signin-values">Women-centered · Inclusive · Safety-first</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1.5 text-xs mt-3 text-[#4c4570]">
              <Link to="/privacy" className="hover:text-[#a29dc4] transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-[#a29dc4] transition-colors">Terms of Service</Link>
              <Link to="/data-deletion" className="hover:text-[#a29dc4] transition-colors">Data Deletion</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignInPage;
