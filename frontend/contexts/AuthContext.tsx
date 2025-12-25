'use client';

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/* =======================
   Types
======================= */

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

/* =======================
   Context
======================= */

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/* =======================
   Provider
======================= */

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* =======================
     Init auth state
  ======================= */

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Session error:', error.message);
          // Clear invalid session
          await supabase.auth.signOut({ scope: 'local' });
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Supabase init error:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event);

      if (_event === 'TOKEN_REFRESHED') {
        console.log('✅ Token refreshed successfully');
      }

      if (_event === 'SIGNED_OUT') {
        console.log('User signed out');
      }

      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =======================
     Sign up
  ======================= */

  const signUp = async (
    email: string,
    password: string,
    username: string
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: username,
          },
        },
      });

      if (error) {
        console.error('Signup error:', error);
        return { error };
      }

      // Profiles are created by DB trigger.
      // No role logic here by design.
      return { error: null };
    } catch (err) {
      console.error('Signup exception:', err);
      return { error: err };
    }
  };

  /* =======================
     Sign in
     (IMPORTANT PART FROM EMERGENT)
  ======================= */

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // ⭐ FORCE STATE UPDATE AFTER LOGIN
    // This guarantees that useAdminRole() re-runs
    if (!error && data?.session) {
      setSession(data.session);
      setUser(data.session.user);
    }

    return { error };
  };

  /* =======================
     Sign out
  ======================= */

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  /* =======================
     Provider value
  ======================= */

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
