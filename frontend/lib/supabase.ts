import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Check if we're in a server/SSR environment BEFORE any other imports
const isServer = typeof window === 'undefined';
console.log('[SUPABASE INIT] isServer:', isServer);

// Create a no-op storage for SSR
const noopStorage = {
  getItem: async (key: string) => {
    console.log('[SUPABASE NOOP] getItem called for key:', key);
    return null;
  },
  setItem: async (key: string, value: string) => {
    console.log('[SUPABASE NOOP] setItem called for key:', key);
  },
  removeItem: async (key: string) => {
    console.log('[SUPABASE NOOP] removeItem called for key:', key);
  },
};

// Determine platform safely
const getPlatform = (): 'web' | 'native' => {
  if (isServer) return 'web'; // During SSR, treat as web
  try {
    const { Platform } = require('react-native');
    return Platform.OS === 'web' ? 'web' : 'native';
  } catch {
    return 'web';
  }
};

// Lazy initialization pattern
let _supabaseClient: SupabaseClient | null = null;

const initSupabase = (): SupabaseClient => {
  if (_supabaseClient) {
    console.log('[SUPABASE] Returning existing client');
    return _supabaseClient;
  }

  const platform = getPlatform();
  console.log('[SUPABASE] Creating new client. isServer:', isServer, 'platform:', platform);

  // For SSR (server-side rendering), use no-op storage
  if (isServer) {
    console.log('[SUPABASE] Creating SSR client with noopStorage');
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

  // For web platform (client-side), use the SSR-safe browser client
  if (platform === 'web') {
    console.log('[SUPABASE] Creating web browser client');
    _supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    return _supabaseClient;
  }

  // For native (iOS/Android), use AsyncStorage
  console.log('[SUPABASE] Creating native client with AsyncStorage');
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
    console.log('[SUPABASE PROXY] Accessing property:', prop);
    const client = initSupabase();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
