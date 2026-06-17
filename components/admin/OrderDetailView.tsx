'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Undo2, Mail } from 'lucide-react';
import StatusBadge from './StatusBadge';
import ConfirmDialog from './ConfirmDialog';
import { usd, dateTime } from './format';
import { retryProvision, refundOrder, type AdminOrderDetail } from '@/server/actions/admin-orders';

const PROVISION_STEPS = ['queued', 'creating_esim', 'activating_plan', 'confirming', 'fulfilled'] as const;

export default function OrderDetailView({ order, isSuperAdmin }: { order: AdminOrderDetail; isSuperAdmin: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | 'retry' | 'refund'>(null);

  const canRetry = order.status === 'failed_needs_review' || order.status === 'paid';
  const canRefund = isSuperAdmin && (order.status === 'fulfilled' || order.status === 'paid' || order.status === 'failed_needs_review');

  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-[#9933c1]">
        <ArrowLeft className="h-4 w-4" /> Volver a órdenes
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Orden #{order.shortId}</h1>
          <StatusBadge kind="order" value={order.status} />
        </div>
        <div className="flex items-center gap-2">
          {canRetry && (
            <button
              onClick={() => setDialog('retry')}
              className="flex items-center gap-1.5 rounded-xl bg-[#9933c1] hover:bg-[#7100a5] px-4 py-2 text-sm font-bold text-white transition cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" /> Reintentar emisión
            </button>
          )}
          {canRefund && (
            <button
              onClick={() => setDialog('refund')}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-400/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 px-4 py-2 text-sm font-bold transition cursor-pointer"
            >
              <Undo2 className="h-4 w-4" /> Reembolsar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datos */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">Comprador y pago</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Email" value={order.email ?? '—'} />
              <Field label="Teléfono" value={order.phone ?? '—'} />
              <Field label="Plan" value={order.planName} />
              <Field label="Monto" value={`${usd(order.pricePaid)} ${order.currency}`} />
              <Field label="Idioma" value={order.lang} />
              <Field label="Fecha" value={dateTime(order.createdAt)} />
              <Field label="PaymentIntent" value={order.paymentIntentId ?? '—'} mono />
            </dl>
          </div>

          {/* Timeline de provisión */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">Provisión de la eSIM</h2>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {PROVISION_STEPS.map((step) => {
                const reached =
                  order.provisionState &&
                  PROVISION_STEPS.indexOf(order.provisionState as (typeof PROVISION_STEPS)[number]) >= PROVISION_STEPS.indexOf(step);
                const current = order.provisionState === step;
                return (
                  <span
                    key={step}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      current
                        ? 'bg-[#9933c1] text-white'
                        : reached
                          ? 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]'
                          : 'bg-zinc-100 text-zinc-400 dark:bg-white/5'
                    }`}
                  >
                    {step}
                  </span>
                );
              })}
            </div>
            {order.attemptCount > 0 && (
              <p className="text-xs text-zinc-500 mb-2">Intentos fallidos: {order.attemptCount}</p>
            )}
            {order.lastError && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-400/10 rounded-lg p-3 font-mono break-all mb-3">{order.lastError}</p>
            )}
            {order.provisionHistory.length > 0 && (
              <ol className="space-y-1.5 border-l-2 border-zinc-100 dark:border-white/10 pl-4">
                {order.provisionHistory.map((h, i) => (
                  <li key={i} className="text-xs text-zinc-500">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{h.state ?? (h.error ? 'error' : '—')}</span>
                    {h.note ? ` · ${h.note}` : ''}
                    {h.error ? ` · ${h.error}` : ''}
                    {h.at ? ` · ${dateTime(h.at)}` : ''}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* eSIM + entrega */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">eSIM</h2>
            {order.esim ? (
              <dl className="space-y-3 text-sm">
                <Field label="ICCID" value={order.esim.iccid ?? '—'} mono />
                <div>
                  <dt className="text-xs text-zinc-400">Estado</dt>
                  <dd className="mt-1">{order.esim.statusQr ? <StatusBadge kind="esim" value={order.esim.statusQr} /> : '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-zinc-400">Todavía no se emitió.</p>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
              <Mail className="h-4 w-4" /> Entrega del QR
            </h2>
            {order.delivery ? (
              <dl className="space-y-2 text-sm">
                <Field label="Estado" value={order.delivery.status ?? '—'} />
                <Field label="Enviado" value={dateTime(order.delivery.sentAt)} />
                {order.delivery.lastError && <Field label="Último error" value={order.delivery.lastError} mono />}
              </dl>
            ) : (
              <p className="text-sm text-zinc-400">Sin entregas registradas.</p>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={dialog === 'retry'}
        title="Reintentar la emisión"
        description="Se reanuda la provisión desde el punto donde quedó. Si llega a fulfilled, se envía el email con el QR."
        confirmLabel="Reintentar"
        onConfirm={async () => {
          const r = await retryProvision({ orderId: order.id });
          if (r.ok) refresh();
          return { ok: r.ok, error: r.ok ? undefined : r.error.message };
        }}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'refund'}
        title="Reembolsar la orden"
        description="Se reembolsa el pago en Stripe y la orden queda como 'Reembolsada'. Esta acción no se puede deshacer."
        confirmLabel="Reembolsar"
        tone="danger"
        onConfirm={async () => {
          const r = await refundOrder({ orderId: order.id });
          if (r.ok) refresh();
          return { ok: r.ok, error: r.ok ? undefined : r.error.message };
        }}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className={`mt-0.5 text-zinc-800 dark:text-zinc-200 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
