import { createClient } from '@supabase/supabase-js';

// Support both VITE_ prefix and NEXT_PUBLIC_ prefix (Supabase dashboard default)
const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
) as string;

const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''
) as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or Anon Key not configured. Check .env file.');
}

/**
 * Public Supabase client (anon key).
 * Used for:
 * - Read operations (events, themes, holidays)
 * - Public draft submission
 * - Realtime subscriptions
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
