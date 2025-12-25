import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Check if we're in a browser/server environment for SSR
const isServer = typeof window === 'undefined';

// Create a universal storage adapter that works in all environments
const createStorage = () => {
  // Server-side: return a no-op storage
  if (isServer) {
    return {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    };
  }

  // Client-side web: use localStorage
  if (typeof localStorage !== 'undefined') {
    return {
      getItem: async (key: string) => localStorage.getItem(key),
      setItem: async (key: string, value: string) => localStorage.setItem(key, value),
      removeItem: async (key: string) => localStorage.removeItem(key),
    };
  }

  // Native: use AsyncStorage (lazy import to avoid SSR issues)
  return {
    getItem: async (key: string) => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return AsyncStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return AsyncStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return AsyncStorage.removeItem(key);
    },
  };
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createStorage(),
    autoRefreshToken: true,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
