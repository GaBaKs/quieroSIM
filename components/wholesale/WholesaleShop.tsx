'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Search, Plus, Minus, ShoppingCart, Loader2, ArrowLeft, CheckCircle2, Package } from 'lucide-react';
import { createWholesaleCheckout, type WholesalePlan } from '@/server/actions/wholesale';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const usd = (n: number) => `$${n.toFixed(2)}`;

type Step = 'shop' | 'pay' | 'done';

export default function WholesaleShop({ catalog }: { catalog: WholesalePlan[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [step, setStep] = useState<Step>('shop');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ clientSecret: string; totalUsd: number; count: number } | null>(null);

  const byId = useMemo(() => new Map(catalog.map((p) => [p.planId, p])), [catalog]);
  const cartItems = Object.entries(cart).filter(([, qty]) => qty > 0);
  const count = cartItems.reduce((s, [, qty]) => s + qty, 0);
  const total = cartItems.reduce((s, [id, qty]) => s + (byId.get(id)?.priceWholesale ?? 0) * qty, 0);

  const setQty = (planId: string, qty: number) => setCart((c) => ({ ...c, [planId]: Math.max(0, qty) }));

  const rows = catalog.filter((p) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return p.name.toLowerCase().includes(s) || (p.countryRegion ?? '').toLowerCase().includes(s) || (p.isoCountry ?? '').toLowerCase().includes(s);
  });

  const goPay = async () => {
    if (count === 0) return;
    setBusy(true); setError(null);
    const items = cartItems.map(([planId, qty]) => ({ planId, qty }));
    const res = await createWholesaleCheckout({ items });
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    setSession({ clientSecret: res.data.clientSecret, totalUsd: res.data.totalUsd, count: res.data.count });
    setStep('pay');
  };

  if (step === 'done') {
    return (
      <div className="rounded-2xl border border-[#9933c1]/20 bg-[#9933c1]/[0.04] p-8 text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 text-[#9933c1] dark:text-[#b3ff6b] mx-auto" />
        <h3 className="font-black text-xl text-zinc-900 dark:text-white">¡Compra realizada!</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Tus eSIMs se están emitiendo. En unos minutos vas a verlas en tu inventario para asignarlas a tus clientes.</p>
        <button onClick={() => { setCart({}); setSession(null); setStep('shop'); router.refresh(); }} className="rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold px-5 py-2.5 text-sm cursor-pointer">Comprar otro lote</button>
      </div>
    );
  }

  if (step === 'pay' && session) {
    return (
      <div className="space-y-4">
        <button onClick={() => setStep('shop')} className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"><ArrowLeft className="h-4 w-4" /> Volver al catálogo</button>
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-lg text-zinc-900 dark:text-white">Pagar lote</h3>
            <div className="text-right">
              <div className="text-2xl font-black text-zinc-900 dark:text-white">{usd(session.totalUsd)}</div>
              <div className="text-xs text-zinc-400">{session.count} eSIM{session.count === 1 ? '' : 's'}</div>
            </div>
          </div>
          {stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret: session.clientSecret, appearance: { theme: 'stripe' } }}>
              <PayForm total={session.totalUsd} onPaid={() => setStep('done')} />
            </Elements>
          ) : (
            <p className="text-sm text-red-500">Stripe no está configurado.</p>
          )}
        </div>
      </div>
    );
  }

  // step shop
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar destino o plan (ej. Japón, Europa, 10GB)"
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 divide-y divide-zinc-100 dark:divide-white/5 max-h-[60vh] overflow-y-auto">
          {rows.length === 0 && <p className="p-8 text-center text-sm text-zinc-400">No hay planes que coincidan.</p>}
          {rows.map((p) => (
            <PlanRow key={p.planId} p={p} qty={cart[p.planId] ?? 0} setQty={setQty} />
          ))}
        </div>
      </div>

      {/* Carrito */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-5 sticky top-4 space-y-3">
          <div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-[#9933c1] dark:text-[#b3ff6b]" /><h3 className="font-black text-zinc-900 dark:text-white">Tu lote</h3></div>
          {cartItems.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center"><Package className="h-8 w-8 mx-auto mb-2 opacity-30" />Agregá planes al lote.</p>
          ) : (
            <>
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                {cartItems.map(([id, qty]) => {
                  const p = byId.get(id);
                  if (!p) return null;
                  return (
                    <div key={id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-zinc-700 dark:text-zinc-200">{qty}× {p.name}</span>
                      <span className="font-bold text-zinc-900 dark:text-white shrink-0">{usd(p.priceWholesale * qty)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-zinc-200 dark:border-white/10 pt-2 flex items-center justify-between">
                <span className="text-sm text-zinc-500">{count} eSIM{count === 1 ? '' : 's'}</span>
                <span className="text-xl font-black text-zinc-900 dark:text-white">{usd(total)}</span>
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={goPay} disabled={busy || count === 0} className="w-full rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold py-3 text-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />} Continuar al pago
          </button>
          <p className="text-[11px] text-zinc-400 text-center">El total final se confirma al pagar (precio mayorista de tu cuenta).</p>
        </div>
      </div>
    </div>
  );
}

function PayForm({ total, onPaid }: { total: number; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    if (!stripe || !elements) return;
    setPaying(true); setError(null);
    const { error: submitErr } = await elements.submit();
    if (submitErr) { setError(submitErr.message ?? 'Revisá los datos de pago.'); setPaying(false); return; }
    const { error: confirmErr } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    setPaying(false);
    if (confirmErr) { setError(confirmErr.message ?? 'No se pudo procesar el pago.'); return; }
    onPaid();
  };

  return (
    <div className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button onClick={pay} disabled={paying || !stripe} className="w-full rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold py-3 text-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
        {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Pagar {usd(total)}
      </button>
    </div>
  );
}

function PlanRow({ p, qty, setQty }: { p: WholesalePlan; qty: number; setQty: (id: string, q: number) => void }) {
  const [expanded, setExpanded] = useState(false);

  const text = p.countryRegion ?? p.isoCountry ?? '';
  const isLong = text.length > 80;
  const displayText = expanded || !isLong ? text : text.slice(0, 80) + '...';

  return (
    <div className="p-3 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{p.name}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5 break-words">
          {displayText}
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-1 font-bold text-[#9933c1] dark:text-[#b3ff6b] hover:underline cursor-pointer"
            >
              {expanded ? 'Mostrar menos' : 'Mostrar más'}
            </button>
          )}
          <span className="ml-1 opacity-70">· {p.durationDays ?? '—'} días</span>
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0 pt-0.5">
        <span className="text-sm font-black text-[#9933c1] dark:text-[#b3ff6b]">{usd(p.priceWholesale)}</span>
        {qty > 0 ? (
          <div className="flex items-center gap-1.5">
            <button onClick={() => setQty(p.planId, qty - 1)} className="rounded-md bg-zinc-100 dark:bg-white/10 p-1 cursor-pointer"><Minus className="h-3.5 w-3.5" /></button>
            <input type="number" min="0" value={qty} onChange={(e) => setQty(p.planId, Math.floor(Number(e.target.value) || 0))} className="w-12 text-center text-sm bg-transparent border border-zinc-200 dark:border-white/10 rounded-md py-0.5 dark:text-white" />
            <button onClick={() => setQty(p.planId, qty + 1)} className="rounded-md bg-zinc-100 dark:bg-white/10 p-1 cursor-pointer"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <button onClick={() => setQty(p.planId, 1)} className="rounded-lg bg-[#9933c1] hover:bg-[#7100a5] text-white px-3 py-1.5 text-xs font-bold cursor-pointer">Agregar</button>
        )}
      </div>
    </div>
  );
}
