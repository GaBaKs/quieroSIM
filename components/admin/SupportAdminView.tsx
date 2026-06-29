'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  HeadphonesIcon, BookOpen, HelpCircle, Send, Loader2, ArrowLeft, CheckCircle2, Plus, Trash2, Pencil, X, AlertTriangle,
} from 'lucide-react';
import {
  getAdminTicket, replyToTicket, setTicketStatus, requestRefund,
  upsertKbArticle, deleteKbArticle, promoteUnresolvedToKb,
  type AdminTicketRow, type AdminTicketDetail, type AdminKbArticle, type UnresolvedQuery,
} from '@/server/actions/admin-support';

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'Abierto', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300' },
  in_progress: { label: 'En proceso', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
  resolved: { label: 'Resuelto', cls: 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' },
  closed: { label: 'Cerrado', cls: 'bg-zinc-200 text-zinc-600 dark:bg-white/10 dark:text-zinc-300' },
};
const PRIO: Record<string, string> = { low: 'text-zinc-400', normal: 'text-zinc-500', high: 'text-amber-600 dark:text-amber-400', critical: 'text-red-600 dark:text-red-400' };

type Tab = 'tickets' | 'kb' | 'unresolved';

export default function SupportAdminView({ tickets, kb, unresolved }: { tickets: AdminTicketRow[]; kb: AdminKbArticle[]; unresolved: UnresolvedQuery[] }) {
  const [tab, setTab] = useState<Tab>('tickets');
  const [openId, setOpenId] = useState<string | null>(null);

  if (openId) return <TicketDetail ticketId={openId} onBack={() => setOpenId(null)} />;

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; count: number }> = [
    { id: 'tickets', label: 'Tickets', icon: <HeadphonesIcon className="h-4 w-4" />, count: tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length },
    { id: 'kb', label: 'Base de conocimiento', icon: <BookOpen className="h-4 w-4" />, count: kb.length },
    { id: 'unresolved', label: 'Sin respuesta', icon: <HelpCircle className="h-4 w-4" />, count: unresolved.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer ${tab === t.id ? 'bg-[#9933c1] text-white' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300'}`}>
            {t.icon} {t.label} <span className={`text-xs ${tab === t.id ? 'opacity-80' : 'text-zinc-400'}`}>{t.count}</span>
          </button>
        ))}
      </div>
      {tab === 'tickets' && <TicketsTable tickets={tickets} onOpen={setOpenId} />}
      {tab === 'kb' && <KbTab articles={kb} />}
      {tab === 'unresolved' && <UnresolvedTab queries={unresolved} />}
    </div>
  );
}

function TicketsTable({ tickets, onOpen }: { tickets: AdminTicketRow[]; onOpen: (id: string) => void }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[760px]">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
              {['Usuario', 'Último mensaje', 'Prioridad', 'Estado', ''].map((h) => <th key={h} className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
            {tickets.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-zinc-400">No hay tickets.</td></tr>}
            {tickets.map((t) => {
              const st = STATUS[t.status] ?? STATUS.open;
              return (
                <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 cursor-pointer" onClick={() => onOpen(t.id)}>
                  <td className="py-3 px-4">
                    <div className="text-sm font-bold text-zinc-900 dark:text-white">{t.userName ?? '—'}</div>
                    <div className="text-[11px] text-zinc-400">{t.userEmail ?? '—'}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-300 max-w-[280px] truncate">{t.lastMessage ?? '—'}</td>
                  <td className={`py-3 px-4 text-xs font-bold uppercase ${PRIO[t.priority] ?? ''}`}>{t.priority}</td>
                  <td className="py-3 px-4"><span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${st.cls}`}>{st.label}</span></td>
                  <td className="py-3 px-4 text-xs font-bold text-[#9933c1] dark:text-[#b3ff6b] whitespace-nowrap">Abrir →</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const router = useRouter();
  const [t, setT] = useState<AdminTicketDetail | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => { const res = await getAdminTicket({ ticketId }); if (res.ok) setT(res.data); };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ticketId]);
  useEffect(() => { endRef.current?.scrollIntoView(); }, [t?.messages.length]);

  const reply = async () => {
    if (body.trim().length < 1 || busy) return;
    setBusy(true);
    const res = await replyToTicket({ ticketId, body: body.trim() });
    setBusy(false);
    if (res.ok) { setBody(''); load(); router.refresh(); } else alert(res.error.message);
  };
  const act = async (fn: () => Promise<{ ok: boolean; error?: { message: string } }>) => {
    setBusy(true); const res = await fn(); setBusy(false);
    if (res.ok) { load(); router.refresh(); } else alert(res.error?.message);
  };

  const closed = t?.status === 'resolved' || t?.status === 'closed';

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"><ArrowLeft className="h-4 w-4" /> Volver a tickets</button>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden flex flex-col h-[70vh]">
        <div className="p-4 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-zinc-900 dark:text-white text-sm">{t?.userName ?? '—'} <span className="font-normal text-zinc-400">· {t?.userEmail ?? ''}</span></p>
            {t && <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${(STATUS[t.status] ?? STATUS.open).cls}`}>{(STATUS[t.status] ?? STATUS.open).label}</span>}
          </div>
          <div className="flex items-center gap-2">
            {!closed && <button onClick={() => act(() => requestRefund({ ticketId }))} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 dark:border-amber-400/30 text-amber-700 dark:text-amber-300 px-2.5 py-1.5 text-xs font-bold hover:bg-amber-50 dark:hover:bg-amber-400/10 cursor-pointer disabled:opacity-50"><AlertTriangle className="h-3.5 w-3.5" /> Solicitar reembolso</button>}
            {!closed && <button onClick={() => act(() => setTicketStatus({ ticketId, status: 'resolved' }))} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-[#9933c1] hover:bg-[#7100a5] text-white px-2.5 py-1.5 text-xs font-bold cursor-pointer disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Resolver</button>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!t ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-zinc-300" /></div> : t.messages.map((m) => (
            <div key={m.id} className={`flex ${m.author === 'agent' ? 'justify-end' : 'justify-start'}`}>
              {m.author === 'system' ? <p className="text-[11px] text-zinc-400 italic mx-auto">{m.body}</p> : (
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.author === 'agent' ? 'bg-[#9933c1] text-white' : 'bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-100'}`}>
                  <p className="text-[10px] font-bold opacity-70 mb-0.5">{m.author === 'agent' ? 'Vos' : m.author === 'bot' ? 'Asistente' : 'Cliente'}</p>
                  <p className="whitespace-pre-line">{m.body}</p>
                </div>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="p-3 border-t border-zinc-200 dark:border-white/10">
          {closed ? <p className="text-center text-xs text-zinc-400 py-2">Caso cerrado. <button onClick={() => act(() => setTicketStatus({ ticketId, status: 'in_progress' }))} className="font-bold text-[#9933c1] dark:text-[#b3ff6b] cursor-pointer">Reabrir</button></p> : (
            <div className="flex gap-2">
              <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && reply()} placeholder="Responder al cliente…" className="flex-1 px-3 py-2.5 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
              <button onClick={reply} disabled={busy || body.trim().length < 1} className="rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white px-4 cursor-pointer disabled:opacity-50 flex items-center">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KbTab({ articles }: { articles: AdminKbArticle[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminKbArticle | 'new' | null>(null);

  const del = async (id: string) => {
    if (!confirm('¿Borrar este artículo?')) return;
    const res = await deleteKbArticle({ id });
    if (res.ok) router.refresh(); else alert(res.error.message);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white px-4 py-2 text-sm font-bold cursor-pointer"><Plus className="h-4 w-4" /> Nuevo artículo</button>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 divide-y divide-zinc-100 dark:divide-white/5">
        {articles.length === 0 && <p className="p-8 text-center text-sm text-zinc-400">No hay artículos. Creá el primero.</p>}
        {articles.map((a) => (
          <div key={a.id} className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-zinc-900 dark:text-white truncate">{a.title}</p>
              <p className="text-[11px] text-zinc-400">{a.category ?? 'sin categoría'}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => setEditing(a)} className="rounded-lg p-2 text-zinc-400 hover:text-[#9933c1] cursor-pointer"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => del(a.id)} className="rounded-lg p-2 text-zinc-400 hover:text-red-500 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {editing && <KbEditor article={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />}
    </div>
  );
}

function KbEditor({ article, onClose, onSaved }: { article: AdminKbArticle | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(article?.title ?? '');
  const [content, setContent] = useState(article?.content ?? '');
  const [category, setCategory] = useState(article?.category ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true); setError(null);
    const res = await upsertKbArticle({ id: article?.id, title: title.trim(), content: content.trim(), category: category.trim() || undefined });
    setBusy(false);
    if (res.ok) onSaved(); else setError(res.error.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-white/10 max-h-[90vh] overflow-y-auto">
        <button onClick={() => !busy && onClose()} className="absolute right-4 top-4 text-zinc-400 cursor-pointer"><X className="h-5 w-5" /></button>
        <h3 className="font-black text-lg text-zinc-900 dark:text-white mb-4">{article ? 'Editar artículo' : 'Nuevo artículo'}</h3>
        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="w-full px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoría (ej. instalacion)" className="w-full px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} placeholder="Contenido del artículo…" className="w-full px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30 resize-none" />
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <button onClick={save} disabled={busy || title.trim().length < 3 || content.trim().length < 10} className="mt-4 w-full rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold py-2.5 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar</button>
      </div>
    </div>
  );
}

function UnresolvedTab({ queries }: { queries: UnresolvedQuery[] }) {
  const router = useRouter();
  const [promote, setPromote] = useState<UnresolvedQuery | null>(null);
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 divide-y divide-zinc-100 dark:divide-white/5">
      {queries.length === 0 && <p className="p-8 text-center text-sm text-zinc-400">No hay consultas sin respuesta. 🎉</p>}
      {queries.map((q) => (
        <div key={q.id} className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-zinc-900 dark:text-white truncate">“{q.queryText}”</p>
            <p className="text-[11px] text-zinc-400">{q.frequency} {q.frequency === 1 ? 'vez' : 'veces'} · última: {q.lastSeenAt ? new Date(q.lastSeenAt).toLocaleDateString() : ''}</p>
          </div>
          <button onClick={() => setPromote(q)} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#9933c1] hover:bg-[#7100a5] text-white px-3 py-1.5 text-xs font-bold cursor-pointer"><Plus className="h-3.5 w-3.5" /> Crear artículo</button>
        </div>
      ))}
      {promote && <PromoteModal query={promote} onClose={() => setPromote(null)} onSaved={() => { setPromote(null); router.refresh(); }} />}
    </div>
  );
}

function PromoteModal({ query, onClose, onSaved }: { query: UnresolvedQuery; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(query.queryText);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(query.category ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setError(null);
    const res = await promoteUnresolvedToKb({ queryId: query.id, title: title.trim(), content: content.trim(), category: category.trim() || undefined });
    setBusy(false);
    if (res.ok) onSaved(); else setError(res.error.message);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-white/10">
        <button onClick={() => !busy && onClose()} className="absolute right-4 top-4 text-zinc-400 cursor-pointer"><X className="h-5 w-5" /></button>
        <h3 className="font-black text-lg text-zinc-900 dark:text-white mb-1">Crear artículo desde la consulta</h3>
        <p className="text-xs text-zinc-400 mb-4">Al guardar, se quita de la cola de consultas sin respuesta.</p>
        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="w-full px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoría" className="w-full px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Respuesta / contenido…" className="w-full px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30 resize-none" />
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <button onClick={save} disabled={busy || title.trim().length < 3 || content.trim().length < 10} className="mt-4 w-full rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold py-2.5 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar y quitar de la cola</button>
      </div>
    </div>
  );
}
