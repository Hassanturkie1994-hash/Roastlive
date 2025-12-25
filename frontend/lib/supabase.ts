import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Create storage based on platform
const getStorage = () => {
  // For web, use localStorage wrapper
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => {
        if (typeof window === 'undefined') return Promise.resolve(null);
        return Promise.resolve(localStorage.getItem(key));
      },
      setItem: (key: string, value: string) => {
        if (typeof window === 'undefined') return Promise.resolve();
        localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        if (typeof window === 'undefined') return Promise.resolve();
        localStorage.removeItem(key);
        return Promise.resolve();
      },
    };
  }
  // For native (iOS/Android), use AsyncStorage
  return AsyncStorage;
};

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
