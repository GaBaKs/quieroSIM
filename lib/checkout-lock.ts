/**
 * Señal global simple: indica si el checkout está abierto. La usa
 * CatalogRealtime para NO refrescar la landing mientras el cliente está
 * comprando (así no le cambia el precio/plan en medio de la compra). El cobro
 * real igual se fija al crear el PaymentIntent.
 */
let open = false;
const listeners = new Set<() => void>();

export const checkoutLock = {
  isOpen: () => open,
  set(v: boolean) {
    if (open === v) return;
    open = v;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
