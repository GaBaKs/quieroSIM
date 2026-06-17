'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/server/types/database';

/**
 * Cliente Supabase para componentes de cliente (anon key + sesión del usuario).
 * Es el ÚNICO cliente que puede tocar el navegador. RLS aplica siempre.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
