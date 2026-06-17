import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from '../lib/env';
import type { Database } from '../types/database';

/**
 * Cliente Supabase anónimo SIN sesión (no toca cookies): para lecturas
 * públicas cacheables con ISR (catálogo, dispositivos). Usar el cliente con
 * sesión (supabase-server.ts) solo cuando la query depende del usuario —
 * cookies() fuerza render dinámico y rompe el caché estático.
 */
export function createSupabaseAnonClient() {
  return createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
