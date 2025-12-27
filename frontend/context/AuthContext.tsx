import React, { createContext, useContext, useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on app start
  useEffect(() => {
    checkExistingSession();
    
    // Handle deep link (cold start - app opened from killed state)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleAuthRedirect(url);
      }
    });

    // Handle deep link (hot start - app already running)
    const subscription = Linking.addEventListener('url', (event) => {
      handleAuthRedirect(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkExistingSession = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/check`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthRedirect = async (url: string) => {
    console.log('Auth redirect URL:', url);
    
    // Parse session_id from URL (supports both hash and query)
    const sessionIdMatch = url.match(/[#?]session_id=([^&]+)/) || url.match(/[?&]session_id=([^&]+)/);
    
    if (sessionIdMatch) {
      const sessionId = sessionIdMatch[1];
      console.log('Found session_id:', sessionId);
      
      setIsLoading(true);
      
      try {
        // Exchange session_id for user data
        const response = await fetch(`${BACKEND_URL}/api/auth/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (response.ok) {
          const userData = await response.json();
          setUser({
            user_id: userData.user_id,
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
          });
          console.log('Auth successful!', userData);
        } else {
          const error = await response.json();
          console.error('Session exchange failed:', error);
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      
      // Platform-specific redirect URLs
      const redirectUrl = Platform.OS === 'web'
        ? `${BACKEND_URL}/`  // Web: Use HTTP URL for same-origin
        : Linking.createURL('/');  // Mobile: Use deep link (exp:// or myapp://)
      
      console.log('Redirect URL:', redirectUrl);
      
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      if (Platform.OS === 'web') {
        // For web, use direct navigation
        window.location.href = authUrl;
      } else {
        // For mobile, use WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        console.log('Auth session result:', result);
        
        if (result.type === 'success' && result.url) {
          // Use result.url as primary source (not Linking events)
          await handleAuthRedirect(result.url);
        } else {
          console.log('Auth cancelled or failed:', result);
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      // Clear user even if request fails
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
