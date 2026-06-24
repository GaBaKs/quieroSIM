'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { checkoutLock } from '@/lib/checkout-lock';

/**
 * Mantiene la landing al día sin recargar: se suscribe por Realtime a cambios
 * en plan / plan_pricing / destination y refresca los server components
 * (router.refresh) cuando el admin toca algo. Debounce de 1.5s para colapsar
 * ráfagas (ej. "Recalcular precios"). Si el checkout está abierto NO refresca
 * (no le cambia el precio al cliente en medio de la compra); lo aplica al cerrar.
 */
export default function CatalogRealtime() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const doRefresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 1500);
    };
    const scheduleRefresh = () => {
      if (checkoutLock.isOpen()) {
        pending.current = true; // se aplica cuando se cierre el checkout
        return;
      }
      doRefresh();
    };

    const channel = supabase
      .channel('catalog-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_pricing' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'destination' }, scheduleRefresh)
      .subscribe();

    const unsub = checkoutLock.subscribe(() => {
      if (!checkoutLock.isOpen() && pending.current) {
        pending.current = false;
        doRefresh();
      }
    });

    return () => {
      if (timer.current) clearTimeout(timer.current);
      unsub();
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
