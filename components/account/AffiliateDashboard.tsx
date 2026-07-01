'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Link2, Ticket, Wallet, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  registerAffiliate, convertToCredit, requestWithdrawal, type MyAffiliate,
} from '@/server/actions/affiliates';

const usd = (n: number) => `$${n.toFixed(2)}`;

export default function AffiliateDashboard({ affiliate }: { affiliate: MyAffiliate | null }) {
  const router = useRouter();

  // Realtime: refresca el panel cuando cambian comisiones/crédito/retiros propios.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!affiliate) return;
    const supabase = createSupabaseBrowserClient();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 1200);
    };
    const filter = `affiliate_profile_id=eq.${affiliate.id}`;
    const channel = supabase
      .channel(`affiliate-${affiliate.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commission_movement', filter }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_credit', filter }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_request', filter }, refresh)
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [affiliate, router]);

  if (!affiliate) return <RegisterForm onDone={() => router.refresh()} />;
  if (affiliate.status === 'pending') return <Notice tone="amber" title="Solicitud en revisión" text="Tu solicitud de afiliado está siendo revisada. Te avisamos cuando se apruebe." />;
  if (affiliate.status === 'rejected') return <Notice tone="red" title="Solicitud rechazada" text="Tu solicitud no fue aprobada. Escribinos si creés que es un error." />;
  if (affiliate.status === 'suspended') return <Notice tone="zinc" title="Cuenta suspendida" text="Tu cuenta de afiliado está suspendida temporalmente." />;

  return <ApprovedDashboard affiliate={affiliate} onChanged={() => router.refresh()} />;
}

function ApprovedDashboard({ affiliate, onChanged }: { affiliate: MyAffiliate; onChanged: () => void }) {
  const b = affiliate.balance;
  const [copied, setCopied] = useState<string | null>(null);
  // El origin solo existe en el cliente. Lo seteamos tras montar para que el
  // primer render del cliente coincida con el del server (evita hydration mismatch).
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const refUrl = affiliate.referralLink ? `${origin}/?aff=${affiliate.referralLink}` : '';

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard no disponible */
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<Wallet className="h-4 w-4" />} label="Disponible" value={usd(b.available)} accent />
        <Stat icon={<Clock className="h-4 w-4" />} label="Retiro en proceso" value={usd(b.withdrawnPending)} />
        <Stat icon={<Ticket className="h-4 w-4" />} label="Crédito" value={usd(b.credit)} />
        <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Retirado" value={usd(b.withdrawn)} />
      </div>

      {/* Link + cupón */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 space-y-3">
        <h3 className="font-bold text-zinc-900 dark:text-white">Tu link y cupón</h3>
        <button onClick={() => copy(refUrl, 'link')} className="w-full flex items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-white/10 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:border-[#9933c1]/50 transition cursor-pointer">
          <span className="flex items-center gap-2 truncate"><Link2 className="h-4 w-4 shrink-0 text-[#9933c1]" /> <span className="truncate">{refUrl}</span></span>
          <span className="text-xs font-bold shrink-0">{copied === 'link' ? 'Copiado ✓' : <Copy className="h-4 w-4" />}</span>
        </button>
        <button onClick={() => affiliate.couponCode && copy(affiliate.couponCode, 'coupon')} className="w-full flex items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-white/10 px-3 py-2 text-sm font-mono text-zinc-700 dark:text-zinc-200 hover:border-[#9933c1]/50 transition cursor-pointer">
          <span className="flex items-center gap-2"><Ticket className="h-4 w-4 text-[#9933c1]" /> {affiliate.couponCode}</span>
          <span className="text-xs font-bold">{copied === 'coupon' ? 'Copiado ✓' : <Copy className="h-4 w-4" />}</span>
        </button>
        <p className="text-[11px] text-zinc-400">Compartí tu link o cupón: cada venta te acredita comisión al instante.</p>
      </div>

      {/* Acciones financieras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AmountAction title="Convertir a crédito" cta="Convertir" max={b.available} hint="Usá tu comisión como saldo en tu próxima compra." run={convertToCredit} onDone={onChanged} />
        <AmountAction title="Solicitar retiro" cta="Solicitar" max={b.available} hint="El pago se realiza por fuera (transferencia). Sujeto a mínimo." run={requestWithdrawal} onDone={onChanged} />
      </div>
    </div>
  );
}

function AmountAction({ title, cta, max, hint, run, onDone }: { title: string; cta: string; max: number; hint: string; run: (i: { amount: number }) => Promise<{ ok: boolean; error?: { message: string } }>; onDone: () => void }) {
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const submit = async () => {
    const amount = Number(val);
    if (!(amount > 0)) return;
    setBusy(true);
    setMsg(null);
    const res = await run({ amount });
    setBusy(false);
    if (res.ok) {
      setVal('');
      setMsg('Listo ✓');
      onDone();
    } else {
      setMsg(res.error?.message ?? 'No se pudo.');
    }
  };
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 space-y-3">
      <h3 className="font-bold text-zinc-900 dark:text-white">{title}</h3>
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">US$</span>
        <input type="number" min="0" step="0.01" value={val} onChange={(e) => setVal(e.target.value)} placeholder="0.00"
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
        <button onClick={() => setVal(String(max))} className="text-[11px] font-bold text-[#9933c1] dark:text-[#b3ff6b] cursor-pointer">Máx</button>
      </div>
      <button onClick={submit} disabled={busy || !(Number(val) > 0)} className="w-full rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold py-2.5 text-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {cta}
      </button>
      {msg && <p className="text-[11px] text-zinc-500">{msg}</p>}
      <p className="text-[11px] text-zinc-400">{hint}</p>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-[#9933c1]/30 bg-[#9933c1]/[0.04]' : 'border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900'}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">{icon} {label}</div>
      <div className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{value}</div>
    </div>
  );
}

function Notice({ tone, title, text }: { tone: 'amber' | 'red' | 'zinc'; title: string; text: string }) {
  const cls = tone === 'amber' ? 'border-amber-200 bg-amber-50 dark:bg-amber-400/10 dark:border-amber-400/20' : tone === 'red' ? 'border-red-200 bg-red-50 dark:bg-red-400/10 dark:border-red-400/20' : 'border-zinc-200 bg-zinc-50 dark:bg-white/5 dark:border-white/10';
  return (
    <div className={`rounded-2xl border p-6 ${cls}`}>
      <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">{text}</p>
    </div>
  );
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const [channel, setChannel] = useState('');
  const [audience, setAudience] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ¿Llegó por el link de otro afiliado? (cookie qs_aff, legible desde el cliente)
  const [referred, setReferred] = useState(false);
  useEffect(() => {
    setReferred(/(^|;\s*)qs_aff=/.test(document.cookie));
  }, []);

  const submit = async () => {
    if (!terms) {
      setError('Tenés que aceptar los términos del programa.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await registerAffiliate({
      channel: channel.trim() || undefined,
      estimatedAudience: audience ? Number(audience) : undefined,
      acceptTerms: true,
    });
    setBusy(false);
    if (res.ok) onDone();
    else setError(res.error.message);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 max-w-lg space-y-4">
      <div>
        <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Sumate al programa de afiliados</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Ganá comisión por cada venta con tu link o cupón. Te acreditamos al instante.</p>
      </div>
      {referred && (
        <div className="rounded-xl border border-[#9933c1]/20 bg-[#9933c1]/[0.05] px-3 py-2 text-[12px] text-[#7100a5] dark:text-[#b3ff6b]">
          🎟️ Te invitó un afiliado. Cuando te aprobemos, esa persona también gana comisión por tus ventas (nivel 2).
        </div>
      )}
      <div>
        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">Canal (opcional)</label>
        <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Instagram @tucuenta, YouTube, agencia…"
          className="w-full px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
      </div>
      <div>
        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">Audiencia estimada (opcional)</label>
        <input type="number" min="0" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="5000"
          className="w-full px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
      </div>
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-[#9933c1]" />
        <span className="text-[13px] text-zinc-600 dark:text-zinc-300">Acepto los términos del programa de afiliados de QuieroSIM.</span>
      </label>
      {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-lg p-2.5">{error}</p>}
      <button onClick={submit} disabled={busy} className="w-full rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold py-3 text-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Quiero ser afiliado
      </button>
    </div>
  );
}
