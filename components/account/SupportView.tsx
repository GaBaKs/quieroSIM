'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { LifeBuoy, Search, Loader2, Send, ArrowLeft, Plus, X, Smartphone, BookOpen, MessageCircle, CheckCircle2, Clock } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  assistantReply, searchKb, createSupportTicket, getMyTickets, getTicket, sendTicketMessage,
  type MyTicket, type KbArticle,
} from '@/server/actions/support';

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'Abierto', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  in_progress: { label: 'En proceso', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  resolved: { label: 'Resuelto', cls: 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' },
  closed: { label: 'Cerrado', cls: 'bg-zinc-200 text-zinc-600 dark:bg-white/10 dark:text-zinc-300' },
};

export default function SupportView({ initialTickets }: { initialTickets: MyTicket[] }) {
  const router = useRouter();
  const [openTicket, setOpenTicket] = useState<string | null>(null);

  if (openTicket) return <TicketChat ticketId={openTicket} onBack={() => { setOpenTicket(null); router.refresh(); }} />;

  return (
    <div className="space-y-6">
      <Assistant onTicketCreated={(id) => setOpenTicket(id)} onRefresh={() => router.refresh()} />
      <TicketsList tickets={initialTickets} onOpen={setOpenTicket} />
    </div>
  );
}

// ── Asistente determinístico (KB + compatibilidad + abrir caso) ──────────────
function Assistant({ onTicketCreated, onRefresh }: { onTicketCreated: (id: string) => void; onRefresh: () => void }) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [articles, setArticles] = useState<KbArticle[] | null>(null);
  const [brands, setBrands] = useState<Array<{ brand: string; models: string[] }> | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [newCaseOpen, setNewCaseOpen] = useState(false);

  const reset = () => { setArticles(null); setBrands(null); setNoResults(false); };

  const doSearch = async () => {
    if (query.trim().length < 2) return;
    setBusy(true); reset();
    const res = await searchKb({ query: query.trim() });
    setBusy(false);
    if (res.ok) { setArticles(res.data); setNoResults(res.data.length === 0); }
  };

  const doCompat = async () => {
    setBusy(true); reset();
    const res = await assistantReply({ intent: 'compatibility' });
    setBusy(false);
    if (res.ok && res.data.kind === 'compatibility') setBrands(res.data.brands);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <LifeBuoy className="h-5 w-5 text-[#9933c1] dark:text-[#b3ff6b]" />
        <h3 className="font-black text-slate-900 dark:text-white">¿En qué te ayudamos?</h3>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Escribí tu consulta (ej. no me llega el QR)"
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30"
          />
        </div>
        <button onClick={doSearch} disabled={busy || query.trim().length < 2} className="rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold px-4 text-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
        </button>
      </div>

      {/* Accesos rápidos */}
      <div className="flex flex-wrap gap-2">
        <Quick icon={<Smartphone className="h-3.5 w-3.5" />} label="¿Mi teléfono es compatible?" onClick={doCompat} />
        <Link href="/account" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:border-[#9933c1]/50 transition cursor-pointer">
          <BookOpen className="h-3.5 w-3.5" /> Estado / reenviar QR (Mis eSIMs)
        </Link>
        <Quick icon={<MessageCircle className="h-3.5 w-3.5" />} label="Hablar con una persona" onClick={() => setNewCaseOpen(true)} />
      </div>

      {/* Resultados */}
      <AnimatePresence mode="wait">
        {articles && articles.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            {articles.map((a) => <KbCard key={a.id} article={a} />)}
          </motion.div>
        )}
        {noResults && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-slate-50 dark:bg-white/5 p-4 text-sm text-slate-600 dark:text-zinc-300">
            No encontramos un artículo para eso. {' '}
            <button onClick={() => setNewCaseOpen(true)} className="font-bold text-[#9933c1] dark:text-[#b3ff6b] hover:underline cursor-pointer">Abrí un caso</button> y te ayuda una persona.
          </motion.div>
        )}
        {brands && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-slate-50 dark:bg-white/5 p-4">
            <p className="text-sm font-bold text-slate-700 dark:text-zinc-200 mb-2">Marcas compatibles con eSIM</p>
            <div className="flex flex-wrap gap-1.5">
              {brands.slice(0, 30).map((b) => (
                <span key={b.brand} className="rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 px-2.5 py-1 text-[11px] text-slate-600 dark:text-zinc-300">{b.brand}</span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">El teléfono debe estar liberado. En la ficha de cada plan tenés el detalle de modelos.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <NewCaseModal open={newCaseOpen} onClose={() => setNewCaseOpen(false)} onCreated={(id) => { setNewCaseOpen(false); onRefresh(); onTicketCreated(id); }} />
    </div>
  );
}

function Quick({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:border-[#9933c1]/50 transition cursor-pointer">
      {icon} {label}
    </button>
  );
}

function KbCard({ article }: { article: KbArticle }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer">
        <span className="text-sm font-bold text-slate-800 dark:text-white">{article.title}</span>
        <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
      </button>
      {open && <div className="px-4 pb-4 text-sm text-slate-600 dark:text-zinc-300 whitespace-pre-line">{article.content}</div>}
    </div>
  );
}

// ── Lista de tickets ──────────────────────────────────────────────────────────
function TicketsList({ tickets, onOpen }: { tickets: MyTicket[]; onOpen: (id: string) => void }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 dark:border-white/10">
        <h3 className="font-black text-slate-900 dark:text-white">Mis casos</h3>
      </div>
      {tickets.length === 0 ? (
        <div className="p-10 text-center text-slate-500 dark:text-zinc-500">
          <LifeBuoy className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No tenés casos abiertos. Usá el buscador de arriba o abrí uno nuevo.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {tickets.map((t) => {
            const st = STATUS[t.status] ?? STATUS.open;
            const last = t.messages.length ? t.messages[t.messages.length - 1] : null;
            return (
              <button key={t.id} onClick={() => onOpen(t.id)} className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer">
                <div className="flex items-start gap-3 min-w-0">
                  {t.status === 'resolved' || t.status === 'closed'
                    ? <CheckCircle2 className="h-5 w-5 text-[#9933c1] dark:text-[#b3ff6b] mt-0.5 shrink-0" />
                    : <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate group-hover:text-[#9933c1] dark:group-hover:text-[#b3ff6b] transition-colors">{last?.body ?? 'Caso de soporte'}</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''} · {t.messages.length} mensaje{t.messages.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${st.cls}`}>{st.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Chat de un ticket (con Realtime) ──────────────────────────────────────────
function TicketChat({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<MyTicket | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const res = await getTicket({ ticketId });
    if (res.ok) setTicket(res.data);
  };

  useEffect(() => {
    load();
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_ticket', filter: `id=eq.${ticketId}` }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(load, 600);
      })
      .subscribe();
    return () => { if (timer.current) clearTimeout(timer.current); supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [ticket?.messages.length]);

  const send = async () => {
    if (body.trim().length < 1 || sending) return;
    setSending(true);
    const res = await sendTicketMessage({ ticketId, body: body.trim() });
    setSending(false);
    if (res.ok) { setBody(''); load(); }
  };

  const closed = ticket?.status === 'resolved' || ticket?.status === 'closed';

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col h-[70vh]">
      <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
        <button onClick={onBack} className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"><ArrowLeft className="h-5 w-5 text-slate-500" /></button>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 dark:text-white text-sm">Caso de soporte</p>
          {ticket && <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${(STATUS[ticket.status] ?? STATUS.open).cls}`}>{(STATUS[ticket.status] ?? STATUS.open).label}</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!ticket ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
        ) : ticket.messages.map((m) => (
          <div key={m.id} className={`flex ${m.author === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.author === 'system' ? (
              <p className="text-[11px] text-slate-400 italic mx-auto">{m.body}</p>
            ) : (
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.author === 'user' ? 'bg-[#9933c1] text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-zinc-100'}`}>
                {m.author === 'agent' && <p className="text-[10px] font-bold opacity-70 mb-0.5">Soporte</p>}
                <p className="whitespace-pre-line">{m.body}</p>
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-slate-200 dark:border-white/10">
        {closed ? (
          <p className="text-center text-xs text-slate-400 py-2">Este caso está cerrado. Abrí uno nuevo si necesitás más ayuda.</p>
        ) : (
          <div className="flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Escribí tu mensaje…"
              className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30"
            />
            <button onClick={send} disabled={sending || body.trim().length < 1} className="rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white px-4 transition disabled:opacity-50 cursor-pointer flex items-center">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal: abrir caso ─────────────────────────────────────────────────────────
function NewCaseModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (msg.trim().length < 2) return;
    setBusy(true); setError(null);
    const res = await createSupportTicket({ firstMessage: msg.trim() });
    setBusy(false);
    if (res.ok) { setMsg(''); onCreated(res.data.ticketId); }
    else setError(res.error.message);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-white/10">
            <button onClick={() => !busy && onClose()} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="h-6 w-6" /></button>
            <h3 className="text-2xl font-black tracking-tight dark:text-white mb-1">Hablar con una persona</h3>
            <p className="text-slate-500 dark:text-zinc-400 mb-6">Contanos tu problema y un agente te responde acá mismo.</p>
            <textarea
              value={msg} onChange={(e) => setMsg(e.target.value)} rows={4}
              placeholder="Incluí el modelo de tu teléfono, el país y cualquier detalle…"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1] resize-none"
            />
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            <button onClick={submit} disabled={busy || msg.trim().length < 2} className="mt-5 w-full rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold py-3 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Abrir caso
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
