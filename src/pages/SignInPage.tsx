import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Shield, Users, MessageCircle, ArrowLeft } from 'lucide-react';
import LoginForm from '@/components/LoginForm';
import CreateAccountForm from '@/components/CreateAccountForm';
import { PasswordResetForm } from '@/components/PasswordResetForm';
import { UserProfile } from '@/components/UserProfile';
import { authService, AuthUser } from '@/lib/auth';
import { Link } from 'react-router-dom';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { ResponsiveWrapper } from '@/components/ResponsiveWrapper';

const SignInPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleSignOut = () => {
    setUser(null);
    setActiveTab('login');
  };

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
    return (
      <div className="page-calm min-h-screen">
        <div className="container mx-auto px-4 py-4">
          <Link to="/heroes" className="inline-flex items-center text-white hover:text-pink-200 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Heroes
          </Link>
        </div>
        <ResponsiveWrapper maxWidth="2xl" className="py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 rainbow-header wedding-title">
              Welcome back, {user.name || user.email}!
            </h1>
            <p className="text-lg text-white/90">
              Manage your profile and account settings
            </p>
          </div>
          <UserProfile user={user} onSignOut={handleSignOut} />
        </ResponsiveWrapper>
      </div>
    );
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
        <ResponsiveWrapper maxWidth="2xl" className="h-full py-8">
          {/* Discover Page Header */}
          <div className="glass-pride-strong padding-responsive mb-4 sm:mb-6 md:mb-8 relative">
            <AnimatedLogo size="lg" className="mb-2 sm:mb-4" />
            <div className="absolute top-4 left-4 w-3 h-3 sm:w-4 sm:h-4 bg-pink-400 rounded-full floating-orb opacity-70"></div>
            <div className="absolute top-6 right-6 w-2 h-2 sm:w-3 sm:h-3 bg-purple-400 rounded-full floating-orb opacity-60" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-4 right-4 w-3 h-3 sm:w-4 sm:h-4 bg-indigo-400 rounded-full floating-orb opacity-80" style={{animationDelay: '2s'}}></div>
          </div>

          {/* Heroes Page Content */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 rainbow-header wedding-title">
              Unleash Your Spirit with Violets and Vibes – Your Premier Online Lesbian Dating and Social Hub!
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Are you ready to connect with extraordinary individuals who share your passion for life and love? Join our dynamic community, where LGBT, LGBTQ+, and LGBTQIA+ advocates come together to forge meaningful relationships. At Violets and Vibes, we don't just celebrate diverse identities; we empower each other to thrive in a supportive and uplifting environment.<br/><br/>Don't miss your chance to be part of a network that values connection, friendship, and love. Together, let's create lasting bonds and a vibrant space where everyone can flourish! Join us today and start your journey towards building the relationships you deserve.
            </p>
            
            {/* Feature Icons */}
            <div className="flex justify-center space-x-8 mb-12">
              <div className="text-center">
                <Heart className="w-12 h-12 text-pink-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Connect</p>
              </div>
              <div className="text-center">
                <Users className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Community</p>
              </div>
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Chat</p>
              </div>
              <div className="text-center">
                <Shield className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Safe</p>
              </div>
            </div>
          </div>

          {/* Auth Forms */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md bg-black/90 border-purple-500/30">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white wedding-heading">
                  {showPasswordReset ? 'Reset Password' : 'Join the Community'}
                </CardTitle>
                <CardDescription className="text-white/70">
                  {showPasswordReset 
                    ? 'Enter your email to reset your password'
                    : 'Sign in or create your account to get started'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
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
            </Card>
          </div>
        </ResponsiveWrapper>
      </div>
    </div>
  );
};

export default SignInPage;