'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Package, UserPlus, Send, Loader2, X, Copy, Search, CheckCircle2, Clock, QrCode } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getMyInventory, assignEsim, resendAssignedQr, type InventoryEsim } from '@/server/actions/wholesale';

const STATUS_QR: Record<string, { label: string; cls: string }> = {
  generated: { label: 'Emitida', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  installed: { label: 'Instalada', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
  active: { label: 'Activada', cls: 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' },
  expired: { label: 'Expirada', cls: 'bg-zinc-200 text-zinc-600 dark:bg-white/10 dark:text-zinc-300' },
};

export default function WholesaleInventory({ agencyId }: { agencyId: string }) {
  const [items, setItems] = useState<InventoryEsim[] | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [assignTarget, setAssignTarget] = useState<InventoryEsim | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState<InventoryEsim | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    const res = await getMyInventory();
    if (res.ok) setItems(res.data);
  };

  useEffect(() => {
    load();
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`agency-inv-${agencyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'esim', filter: `agency_profile_id=eq.${agencyId}` }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(load, 800);
      })
      .subscribe();
    return () => { if (timer.current) clearTimeout(timer.current); supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500); } catch { /* noop */ }
  };

  const resend = async (esimId: string) => {
    setBusyId(esimId);
    const res = await resendAssignedQr({ esimId });
    setBusyId(null);
    if (!res.ok) setErrorModal(res.error.message);
  };

  if (items === null) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-300" /></div>;

  const unassigned = items.filter((e) => e.inventoryStatus === 'unassigned').length;
  const assigned = items.length - unassigned;

  const rows = items.filter((e) => {
    if (filter !== 'all' && e.inventoryStatus !== filter) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      return (e.planName ?? '').toLowerCase().includes(s) || (e.iccid ?? '').toLowerCase().includes(s) || (e.assignedClientEmail ?? '').toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total" value={String(items.length)} />
        <Stat label="Sin asignar" value={String(unassigned)} accent={unassigned > 0} />
        <Stat label="Asignadas" value={String(assigned)} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-10 text-center">
          <Package className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Todavía no tenés eSIMs. Comprá un lote y van a aparecer acá a medida que se emiten.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar plan, ICCID o cliente"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl dark:text-white">
              <option value="all">Todas</option>
              <option value="unassigned">Sin asignar</option>
              <option value="assigned">Asignadas</option>
            </select>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 divide-y divide-zinc-100 dark:divide-white/5">
            {rows.map((e) => {
              const st = STATUS_QR[e.statusQr] ?? STATUS_QR.generated;
              return (
                <div key={e.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{e.planName ?? 'eSIM'}</p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono">{e.iccid ?? 'sin ICCID'}</p>
                    {e.inventoryStatus === 'assigned' && (
                      <p className="text-[11px] text-[#9933c1] dark:text-[#b3ff6b] mt-0.5">→ {e.assignedClientName ? `${e.assignedClientName} · ` : ''}{e.assignedClientEmail}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {e.qrLpa && (
                      <>
                        <button onClick={() => setQrOpen(e)} title="Ver código QR" className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                          <QrCode className="h-3.5 w-3.5" /> Ver QR
                        </button>
                        <button onClick={() => copy(e.qrLpa!, e.id)} title="Copiar código de asignación (LPA)" className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                          <Copy className="h-3.5 w-3.5" /> {copied === e.id ? 'Copiado ✓' : 'Código'}
                        </button>
                      </>
                    )}
                    {e.inventoryStatus === 'unassigned' ? (
                      <button onClick={() => setAssignTarget(e)} className="inline-flex items-center gap-1 rounded-lg bg-[#9933c1] hover:bg-[#7100a5] text-white px-2.5 py-1.5 text-xs font-bold cursor-pointer">
                        <UserPlus className="h-3.5 w-3.5" /> Asignar
                      </button>
                    ) : (
                      <button onClick={() => resend(e.id)} disabled={busyId === e.id} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer disabled:opacity-50">
                        {busyId === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Reenviar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && <p className="p-8 text-center text-sm text-zinc-400">No hay eSIMs que coincidan.</p>}
          </div>
        </>
      )}

      <AssignModal target={assignTarget} onClose={() => setAssignTarget(null)} onDone={() => { setAssignTarget(null); load(); }} />

      {/* Modal de error custom para límite de reenvíos u otros errores */}
      <AnimatePresence>
        {errorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setErrorModal(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 text-center shadow-xl">
              <button onClick={() => setErrorModal(null)} className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer transition-colors"><X className="h-5 w-5" /></button>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20 mb-4">
                <Clock className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-black text-lg text-zinc-900 dark:text-white mb-2">Aviso</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{errorModal}</p>
              <button onClick={() => setErrorModal(null)} className="w-full rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold py-2.5 cursor-pointer hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal QR */}
      <AnimatePresence>
        {qrOpen && qrOpen.qrLpa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={() => setQrOpen(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 text-center shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setQrOpen(null)}
                className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="font-black text-lg text-zinc-900 dark:text-white mb-4">{qrOpen.planName ?? 'eSIM'}</h3>
              
              <div className="inline-block rounded-xl border border-zinc-200 bg-white p-3 shadow-inner mb-4">
                <QRCodeSVG value={qrOpen.qrLpa} size={200} className="mx-auto" />
              </div>
              
              <div className="space-y-1 mt-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Código Manual
                </span>
                <button
                  type="button"
                  onClick={() => copy(qrOpen.qrLpa!, qrOpen.id)}
                  className="inline-flex max-w-full items-center gap-2 overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:border-[#9933c1] transition-colors cursor-pointer"
                >
                  <span className="break-all text-left">{qrOpen.qrLpa}</span>
                  {copied === qrOpen.id ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" /> : <Copy className="h-3.5 w-3.5 shrink-0 text-zinc-400" />}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-amber-300 bg-amber-50 dark:bg-amber-400/10 dark:border-amber-400/30' : 'border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900'}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{value}</div>
    </div>
  );
}

function AssignModal({ target, onClose, onDone }: { target: InventoryEsim | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => { if (target) { setName(''); setEmail(''); setError(null); setOkMsg(null); } }, [target]);

  const submit = async () => {
    if (!target) return;
    setBusy(true); setError(null);
    const res = await assignEsim({ esimId: target.id, clientName: name.trim() || undefined, clientEmail: email.trim() });
    setBusy(false);
    if (res.ok) {
      setOkMsg(res.data.emailed ? 'Asignada y QR enviado al cliente ✓' : 'Asignada. No pudimos enviar el QR ahora — reintentá desde "Reenviar".');
      setTimeout(onDone, 1200);
    } else setError(res.error.message);
  };

  return (
    <AnimatePresence>
      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6">
            <button onClick={() => !busy && onClose()} className="absolute right-3 top-3 text-zinc-400 cursor-pointer"><X className="h-5 w-5" /></button>
            <h3 className="font-black text-lg text-zinc-900 dark:text-white mb-1">Asignar eSIM</h3>
            <p className="text-xs text-zinc-400 mb-4">{target.planName} · le enviamos el QR al cliente por email.</p>
            <div className="space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del cliente (opcional)" className="w-full px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email del cliente" className="w-full px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
            </div>
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            {okMsg && <p className="mt-3 text-sm text-green-700 dark:text-[#b3ff6b] flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> {okMsg}</p>}
            <button onClick={submit} disabled={busy || !/.+@.+\..+/.test(email)} className="mt-5 w-full rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold py-2.5 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Asignar y enviar QR
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
