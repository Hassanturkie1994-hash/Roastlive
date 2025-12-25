// IMPORTANT: No top-level imports that might trigger window access during SSR
// This file exports functions that lazily create the supabase client

import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// We'll store the client once created
let _client: any = null;

// Check server environment synchronously
function checkIsServer(): boolean {
  return typeof window === 'undefined';
}

// Create storage based on environment - called ONLY when needed
function createStorage() {
  const isServer = checkIsServer();
  
  if (isServer) {
    // Server: return no-op storage
    return {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    };
  }
  
  // Client-side web: use localStorage
  return {
    getItem: async (key: string) => localStorage.getItem(key),
    setItem: async (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: async (key: string) => localStorage.removeItem(key),
  };
}

// The main function to get or create the client
export function getSupabaseClient() {
  if (_client) return _client;
  
  const isServer = checkIsServer();
  
  // Dynamic import to avoid SSR issues
  const { createClient } = require('@supabase/supabase-js');
  
  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: createStorage(),
      autoRefreshToken: !isServer,
      persistSession: !isServer,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  
  return _client;
}

// For backwards compatibility - a proxy that calls getSupabaseClient on demand
export const supabase = new Proxy({} as any, {
  get: (_target, prop: string) => {
    // Don't initialize during SSR module evaluation
    if (checkIsServer() && prop !== 'then') {
      // Return dummy values for SSR
      if (prop === 'auth') {
        return {
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signUp: async () => ({ data: null, error: null }),
          signInWithPassword: async () => ({ data: null, error: null }),
          signOut: async () => ({ error: null }),
        };
      }
      if (prop === 'from') {
        return () => ({
          select: () => ({ data: [], error: null }),
          insert: () => ({ data: null, error: null }),
          update: () => ({ data: null, error: null }),
          delete: () => ({ data: null, error: null }),
        });
      }
      return undefined;
    }
    
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
