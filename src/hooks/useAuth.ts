import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadingTimeout = window.setTimeout(() => {
      if (!active) return;
      console.warn('Auth check timed out; continuing unauthenticated for now.');
      setLoading(false);
    }, 8000);

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
        window.clearTimeout(loadingTimeout);
      }
    };

    void initSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
      window.clearTimeout(loadingTimeout);
    });

    return () => {
      active = false;
      window.clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    loading,
    signOut: () => supabase.auth.signOut(),
  };
};
