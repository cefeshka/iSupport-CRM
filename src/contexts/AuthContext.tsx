import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  hasPermission: (module: string, action: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('AuthProvider initializing');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const isDevelopment = import.meta.env.DEV;

  useEffect(() => {
    console.log('AuthProvider useEffect running');

    if (isDevelopment) {
      console.log('Development mode: Using mock admin user');
      const mockUser = {
        id: 'dev-mock-user-id',
        email: 'dev@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User;

      const mockProfile: Profile = {
        id: 'dev-mock-user-id',
        full_name: 'Development Admin',
        role: 'admin',
        location_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setUser(mockUser);
      setProfile(mockProfile);
      setSession({ user: mockUser, access_token: 'mock-token', refresh_token: 'mock-token' } as Session);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Session loaded:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Error loading session:', error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    console.log('Loading profile for user ID:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
      }

      if (data) {
        console.log('Profile loaded:', data);
        setProfile(data);
      } else {
        console.warn('No profile found for user ID:', userId);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string, fullName: string, role: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          role: role
        });

      if (profileError) throw profileError;
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  function isAdmin(): boolean {
    if (!profile) return false;
    return profile.role === 'admin' || profile.role === 'owner';
  }

  async function hasPermission(module: string, action: string): Promise<boolean> {
    if (!user) return false;

    if (isAdmin()) return true;

    try {
      const { data, error } = await supabase.rpc('has_permission', {
        user_id: user.id,
        module_name: module,
        action_name: action
      });

      if (error) {
        console.error('Permission check error:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
