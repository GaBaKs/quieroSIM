'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * true recién después de la hidratación en el cliente, false en SSR.
 * Reemplaza el patrón useState+useEffect(setMounted) sin disparar
 * la regla react-hooks/set-state-in-effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
