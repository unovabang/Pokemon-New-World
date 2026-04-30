import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dovowxtsdwbmvraamkvd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _client = null;

/**
 * Singleton Supabase client with service-role privileges.
 * Bypasses RLS — usable only server-side, NEVER expose to the browser bundle.
 * Throws on first access if SUPABASE_SERVICE_ROLE_KEY is missing.
 */
export function supabaseAdmin() {
  if (_client) return _client;
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY missing. Add it to Railway env vars (server-side only).',
    );
  }
  _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

export function isSupabaseAdminConfigured() {
  return Boolean(SUPABASE_SERVICE_ROLE_KEY);
}
