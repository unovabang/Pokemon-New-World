import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dovowxtsdwbmvraamkvd.supabase.co';

// Lire la clé service-role. Sur ce projet, l'env Railway stocke la clé `sb_secret_*`
// sous le nom SUPABASE_ANON_KEY (nom historique) — on accepte les deux noms.
// IMPORTANT côté config Railway : la valeur DOIT être la clé service-role (sb_secret_*
// ou JWT service_role), jamais une anon/publishable key, sinon les RPC admin échouent.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let _client = null;

/**
 * Singleton Supabase client with service-role privileges.
 * Bypasses RLS — usable only server-side, NEVER expose to the browser bundle.
 * Throws on first access if no service-role key is found in env.
 */
export function supabaseAdmin() {
  if (_client) return _client;
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      'Service-role key missing. Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in Railway env vars (server-side only).',
    );
  }
  _client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

export function isSupabaseAdminConfigured() {
  return Boolean(SERVICE_ROLE_KEY);
}
