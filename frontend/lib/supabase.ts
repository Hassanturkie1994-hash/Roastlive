import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Check if we're in a server/SSR environment
const isServer = typeof window === 'undefined';
const isWeb = Platform.OS === 'web';

// Create a no-op storage for SSR
const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

// Lazy initialization pattern
let _supabaseClient: SupabaseClient | null = null;

const initSupabase = (): SupabaseClient => {
  if (_supabaseClient) return _supabaseClient;

  // For web platform, use the SSR-safe browser client
  if (isWeb && !isServer) {
    _supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    return _supabaseClient;
  }

  // For SSR (server-side rendering), use no-op storage
  if (isServer) {
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: noopStorage,
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    return _supabaseClient;
  }

  // For native (iOS/Android), use AsyncStorage
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  _supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return _supabaseClient;
};

// Export a proxy that lazily initializes the client
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get: (_target, prop: string) => {
    const client = initSupabase();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
