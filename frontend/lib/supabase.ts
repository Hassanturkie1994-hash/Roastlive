import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Web-safe localStorage wrapper
const webStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return Promise.resolve(null);
    try {
      return Promise.resolve(window.localStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return Promise.resolve();
    try {
      window.localStorage.setItem(key, value);
    } catch {}
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return Promise.resolve();
    try {
      window.localStorage.removeItem(key);
    } catch {}
    return Promise.resolve();
  },
};

// Lazy-loaded native storage for React Native
let nativeStorage: any = null;
const getNativeStorage = () => {
  if (!nativeStorage) {
    // Dynamic require to avoid SSR issues
    nativeStorage = require('@react-native-async-storage/async-storage').default;
  }
  return nativeStorage;
};

// Native AsyncStorage wrapper that lazy-loads
const nativeStorageWrapper = {
  getItem: (key: string) => getNativeStorage().getItem(key),
  setItem: (key: string, value: string) => getNativeStorage().setItem(key, value),
  removeItem: (key: string) => getNativeStorage().removeItem(key),
};

// Select storage based on platform
const storage = Platform.OS === 'web' ? webStorage : nativeStorageWrapper;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
