// Browser-side Supabase client
// File: lib/supabase/client.ts

import { createBrowserClient } from '@supabase/ssr';
// import type { Database } from '@/supabase/functions/_shared/types';

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Create a Supabase client for use in browser/client components
 * This client handles authentication state and uses cookies for session management
 * Returns null if Supabase is not configured
 */
export function createClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
