'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Mantiene sincronizados el estado de auth del CLIENTE y los Server Components.
 * Sin esto, tras un login / logout / rotación de token el servidor seguía viendo
 * la sesión vieja hasta un reload duro (F5): las páginas gateadas (/account/*,
 * /admin/*, /wholesale) rebotaban a login o mostraban contenido desactualizado.
 *
 * Escucha onAuthStateChange y, cuando el access token cambia de verdad, hace
 * router.refresh() para re-renderizar los Server Components con la sesión actual.
 * La primera notificación (INITIAL_SESSION al montar) solo fija el baseline, así
 * no dispara un refresh redundante en cada carga.
 */
export default function AuthSync() {
  const router = useRouter();
  const lastToken = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null;
      if (lastToken.current === undefined) {
        lastToken.current = token; // baseline inicial, sin refrescar
        return;
      }
      if (token !== lastToken.current) {
        lastToken.current = token;
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
