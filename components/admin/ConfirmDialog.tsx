'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X } from 'lucide-react';

/**
 * Diálogo de confirmación para acciones admin sensibles (reintento, refund,
 * suspensión). Maneja el estado de carga y el error inline.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'violet',
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'violet' | 'danger';
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    const result = await onConfirm();
    setBusy(false);
    if (result.ok) onClose();
    else setError(result.error ?? 'No se pudo completar la acción.');
  };

  const confirmCls =
    tone === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : 'bg-[#9933c1] hover:bg-[#7100a5] text-white';

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !busy && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => !busy && onClose()}
              className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white pr-6">{title}</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>

            {error && (
              <p className="mt-3 text-sm font-medium text-red-500 bg-red-50 dark:bg-red-400/10 rounded-lg p-2.5">{error}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => !busy && onClose()}
                disabled={busy}
                className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={busy}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition disabled:opacity-60 cursor-pointer ${confirmCls}`}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
