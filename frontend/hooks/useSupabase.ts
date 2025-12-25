'use client';

import { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton holder for the supabase client
let supabaseClient: SupabaseClient | null = null;
let supabasePromise: Promise<SupabaseClient> | null = null;

// Function to lazily load and cache the supabase client
export const getSupabaseClient = async (): Promise<SupabaseClient> => {
  if (supabaseClient) return supabaseClient;
  
  if (!supabasePromise) {
    supabasePromise = import('../lib/supabase').then(mod => {
      supabaseClient = mod.supabase;
      return supabaseClient;
    });
  }
  
  return supabasePromise;
};

// Hook for using supabase in components
export const useSupabase = () => {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSupabaseClient().then(c => {
      setClient(c);
      setIsLoading(false);
    });
  }, []);

  return { supabase: client, isLoading };
};
