import { createClient } from '@supabase/supabase-js';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

// Vite-only env prefix (NEXT_PUBLIC_ removed — this is a Vite app, not Next.js).
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '') as string;
const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''
) as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new ConfigError(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) must be set. Check .env.',
  );
}

/**
 * Public Supabase client (anon key).
 * Used for:
 * - Read operations (events, themes, holidays)
 * - Public draft submission
 * - Realtime subscriptions
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    storage: {
      getItem: (key) => {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(key);
      },
      setItem: (key, value) => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(key, value);
      },
      removeItem: (key) => {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(key);
      },
    },
  },
});
