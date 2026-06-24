'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Mantiene la landing al día sin recargar: se suscribe por Realtime a cambios
 * en plan / plan_pricing / destination y refresca los server components
 * (router.refresh) cuando el admin toca algo. Debounce de 1.5s para colapsar
 * ráfagas (ej. "Recalcular precios" que actualiza miles de filas) en un solo
 * refresh. No renderiza nada.
 */
export default function CatalogRealtime() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const scheduleRefresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 1500);
    };

    const channel = supabase
      .channel('catalog-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_pricing' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'destination' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
