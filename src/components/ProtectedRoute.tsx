import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: JSX.Element;
  requireProfile?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireProfile = false,
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (!user || !requireProfile) return;

    const checkProfile = async () => {
      setCheckingProfile(true);
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      setHasProfile(!!data);
      setCheckingProfile(false);
    };

    checkProfile();
  }, [user, requireProfile]);

  if (loading || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Checking session…
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={`/signin?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (requireProfile && !hasProfile) {
    return <Navigate to="/create-new-profile" replace />;
  }

  return children;
};
