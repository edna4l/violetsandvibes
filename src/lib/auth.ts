import { supabase } from '@/lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  isAdmin?: boolean;
  adminRole?: string;
  permissions?: any;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
}

export const authService = {
  async signUp(data: SignUpData) {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          full_name: data.name,
          username: data.name.toLowerCase().replace(/\s+/g, '_')
        }
      }
    });

    if (error) throw error;
    return authData;
  },

  async signIn(data: LoginData) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    return authData;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // Keep navigation in the router to avoid full page reloads.
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    // Check if user is admin
    const { data: adminRole } = await supabase
      .from('admin_roles')
      .select('role, permissions')
      .eq('user_id', user.id)
      .single();
    
    return {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name,
      isAdmin: !!adminRole,
      adminRole: adminRole?.role,
      permissions: adminRole?.permissions,
    };
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name,
        });
      } else {
        callback(null);
      }
    });
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/social`
      }
    });
    if (error) throw error;
    return data;
  },

  async signInWithGitHub() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/social`
      }
    });
    if (error) throw error;
    return data;
  },

  async updateProfile(updates: { name?: string; email?: string }) {
    const { error } = await supabase.auth.updateUser({
      email: updates.email,
      data: { name: updates.name }
    });
    if (error) throw error;
  }
};