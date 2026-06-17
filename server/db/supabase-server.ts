import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { requireEnv } from '../lib/env';
import type { Database } from '../types/database';

/**
 * Cliente Supabase server-side CON la sesión del usuario (cookies).
 * Usar en Server Actions y Server Components: RLS aplica con el rol del usuario.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll desde un Server Component es no-op: el middleware
            // refresca la sesión; acá solo leemos.
          }
        },
      },
    },
  );
}
