'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HeadphonesIcon,
  Search,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  AlertTriangle,
  X,
  Send,
  Bot,
  User,
  Lightbulb,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import QuieroButton from '@/components/ui/QuieroButton';
import StatusBadge from '@/components/admin/StatusBadge';
import { shortDate } from '@/components/admin/format';

// ─── Mock data ──────────────────────────────────────────────────────────────

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type Priority = 'high' | 'medium' | 'low';

interface MockMessage {
  sender: 'bot' | 'customer' | 'agent';
  text: string;
  time: string;
}

interface MockTicket {
  id: string;
  customerName: string;
  customerEmail: string;
  channel: 'chat' | 'email' | 'whatsapp';
  status: TicketStatus;
  priority: Priority;
  agent: string | null;
  subject: string;
  orderId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  messages: MockMessage[];
}

interface MockKBSuggestion {
  id: string;
  query: string;
  category: string;
  frequency: number;
  suggestedForFaq: boolean;
  lastSeen: string;
}

const MOCK_TICKETS: MockTicket[] = [
  {
    id: 'TK-001', customerName: 'Lucas García', customerEmail: 'lucas@gmail.com',
    channel: 'whatsapp', status: 'open', priority: 'high', agent: null,
    subject: 'eSIM no se activa en iPhone 15', orderId: 'ORD-8a2f',
    createdAt: '2026-06-17T20:30:00Z', resolvedAt: null,
    messages: [
      { sender: 'customer', text: 'Hola, compré una eSIM para Europa pero no logro activarla en mi iPhone 15.', time: '2026-06-17T20:30:00Z' },
      { sender: 'bot', text: 'Hola Lucas, gracias por escribirnos. Para activar tu eSIM, andá a Ajustes > Datos móviles > Agregar eSIM y escaneá el código QR que te enviamos por email. ¿Pudiste encontrar el QR?', time: '2026-06-17T20:30:15Z' },
      { sender: 'customer', text: 'Sí, pero cuando lo escaneo me dice "No se puede agregar este plan de datos móviles".', time: '2026-06-17T20:31:00Z' },
      { sender: 'bot', text: 'Entiendo. Ese error puede deberse a que el teléfono está bloqueado por el operador. ¿Tu iPhone está liberado/desbloqueado? Si necesitás ayuda adicional, puedo conectarte con un agente humano.', time: '2026-06-17T20:31:20Z' },
      { sender: 'customer', text: 'Sí, está liberado. Quiero hablar con un agente por favor.', time: '2026-06-17T20:32:00Z' },
    ],
  },
  {
    id: 'TK-002', customerName: 'Ana Rodríguez', customerEmail: 'ana@hotmail.com',
    channel: 'email', status: 'in_progress', priority: 'medium', agent: 'Soporte 1',
    subject: 'Solicitud de reembolso — plan no utilizado', orderId: 'ORD-9c3d',
    createdAt: '2026-06-16T14:00:00Z', resolvedAt: null,
    messages: [
      { sender: 'customer', text: 'Buenos días, compré un plan de USA pero finalmente no viajé. ¿Puedo obtener un reembolso? La eSIM nunca fue activada.', time: '2026-06-16T14:00:00Z' },
      { sender: 'agent', text: 'Hola Ana, gracias por contactarnos. Voy a revisar tu orden para verificar que la eSIM no fue activada y proceder con el reembolso. Te aviso en breve.', time: '2026-06-16T15:30:00Z' },
    ],
  },
  {
    id: 'TK-003', customerName: 'Pedro Martínez', customerEmail: 'pedro@yahoo.com',
    channel: 'chat', status: 'resolved', priority: 'low', agent: 'Soporte 1',
    subject: '¿Cómo verifico mi consumo de datos?', orderId: null,
    createdAt: '2026-06-15T10:00:00Z', resolvedAt: '2026-06-15T10:15:00Z',
    messages: [
      { sender: 'customer', text: '¿Dónde puedo ver cuántos datos me quedan?', time: '2026-06-15T10:00:00Z' },
      { sender: 'bot', text: 'Podés ver tu consumo de datos desde tu panel de usuario en quierosim.com/account. Ahí verás el estado y consumo de cada eSIM activa. ¿Necesitás algo más?', time: '2026-06-15T10:00:15Z' },
      { sender: 'customer', text: '¡Perfecto, gracias!', time: '2026-06-15T10:01:00Z' },
    ],
  },
  {
    id: 'TK-004', customerName: 'Sofía Díaz', customerEmail: 'sofia@gmail.com',
    channel: 'whatsapp', status: 'open', priority: 'medium', agent: null,
    subject: 'Reenvío de QR — no recibí el email', orderId: 'ORD-6a0f',
    createdAt: '2026-06-17T18:00:00Z', resolvedAt: null,
    messages: [
      { sender: 'customer', text: 'Hola, compré una eSIM para Japón pero no me llegó el QR por email.', time: '2026-06-17T18:00:00Z' },
      { sender: 'bot', text: 'Hola Sofía, revisé tu orden y el QR fue enviado a sofia@gmail.com. ¿Revisaste la carpeta de spam? También puedo reenviártelo ahora mismo.', time: '2026-06-17T18:00:20Z' },
      { sender: 'customer', text: 'Sí revisé spam y no está. ¿Me lo podés reenviar?', time: '2026-06-17T18:01:00Z' },
    ],
  },
];

const MOCK_KB_SUGGESTIONS: MockKBSuggestion[] = [
  { id: 'kb-1', query: '¿Los planes ilimitados son realmente ilimitados?', category: 'Planes', frequency: 23, suggestedForFaq: true, lastSeen: '2026-06-17T19:00:00Z' },
  { id: 'kb-2', query: '¿Puedo usar la eSIM en dos dispositivos?', category: 'Instalación', frequency: 15, suggestedForFaq: true, lastSeen: '2026-06-17T16:00:00Z' },
  { id: 'kb-3', query: '¿En cuánto tiempo llega el QR?', category: 'Entrega', frequency: 12, suggestedForFaq: true, lastSeen: '2026-06-17T14:00:00Z' },
  { id: 'kb-4', query: '¿Puedo hacer llamadas con la eSIM?', category: 'Planes', frequency: 8, suggestedForFaq: true, lastSeen: '2026-06-16T20:00:00Z' },
  { id: 'kb-5', query: '¿Cómo cancelo mi plan antes de que expire?', category: 'Gestión', frequency: 4, suggestedForFaq: false, lastSeen: '2026-06-15T11:00:00Z' },
  { id: 'kb-6', query: '¿La eSIM funciona en avión?', category: 'Uso', frequency: 3, suggestedForFaq: false, lastSeen: '2026-06-14T09:00:00Z' },
];

// ─── Component ──────────────────────────────────────────────────────────────

const channelIcon = { chat: MessageSquare, email: Mail, whatsapp: Phone };
const priorityCls: Record<Priority, string> = {
  high: 'bg-red-50 text-red-600 dark:bg-red-400/15 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  low: 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300',
};
const priorityLabel: Record<Priority, string> = { high: 'Alta', medium: 'Media', low: 'Baja' };

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}min`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function SupportView() {
  const [tab, setTab] = useState<'tickets' | 'kb'>('tickets');
  const [filterStatus, setFilterStatus] = useState<'all' | TicketStatus>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MockTicket | null>(null);
  const [reply, setReply] = useState('');

  const filteredTickets = useMemo(() => {
    return MOCK_TICKETS.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.customerName.toLowerCase().includes(q) || t.customerEmail.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [filterStatus, search]);

  const totals = useMemo(() => ({
    open: MOCK_TICKETS.filter((t) => t.status === 'open').length,
    inProgress: MOCK_TICKETS.filter((t) => t.status === 'in_progress').length,
    resolved: MOCK_TICKETS.filter((t) => t.status === 'resolved' || t.status === 'closed').length,
    kbSuggested: MOCK_KB_SUGGESTIONS.filter((k) => k.suggestedForFaq).length,
  }), []);

  const statusFilters: { label: string; value: 'all' | TicketStatus }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Abiertos', value: 'open' },
    { label: 'En curso', value: 'in_progress' },
    { label: 'Resueltos', value: 'resolved' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tickets abiertos', value: String(totals.open), icon: HeadphonesIcon, color: 'text-red-400' },
          { label: 'En curso', value: String(totals.inProgress), icon: Clock, color: 'text-yellow-400' },
          { label: 'Resueltos', value: String(totals.resolved), icon: MessageSquare, color: 'text-[#b3ff6b]' },
          { label: 'FAQs sugeridas', value: String(totals.kbSuggested), icon: Lightbulb, color: 'text-[#9933c1]' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-5 flex items-start gap-4">
            <div className={`p-2.5 rounded-xl bg-black/5 dark:bg-white/5 ${kpi.color}`}><kpi.icon className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight mt-0.5">{kpi.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/10 pb-0">
        {[
          { label: 'Tickets', value: 'tickets' as const, icon: HeadphonesIcon },
          { label: 'Knowledge Base', value: 'kb' as const, icon: BookOpen },
        ].map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors cursor-pointer ${
              tab === t.value ? 'border-[#9933c1] text-[#9933c1] dark:text-[#b3ff6b] dark:border-[#b3ff6b]' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'tickets' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, email o ID..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30 focus:border-[#9933c1] transition-all" />
            </div>
            <div className="flex items-center gap-1.5">
              {statusFilters.map((f) => (
                <button key={f.value} onClick={() => setFilterStatus(f.value)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    filterStatus === f.value ? 'bg-[#9933c1] text-white border-[#9933c1]' : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5'
                  }`}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* Tickets Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">ID</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Cliente</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Asunto</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Canal</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Prioridad</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Tiempo</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {filteredTickets.length === 0 ? (
                    <tr><td colSpan={8} className="py-10 text-center text-zinc-400 text-sm">No hay tickets.</td></tr>
                  ) : (
                    filteredTickets.map((tk) => {
                      const ChIcon = channelIcon[tk.channel];
                      return (
                        <tr key={tk.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 font-bold text-sm text-[#9933c1] dark:text-[#b3ff6b]">{tk.id}</td>
                          <td className="py-3 px-4">
                            <p className="text-sm font-bold text-zinc-900 dark:text-white">{tk.customerName}</p>
                            <p className="text-[11px] text-zinc-400">{tk.customerEmail}</p>
                          </td>
                          <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate">{tk.subject}</td>
                          <td className="py-3 px-4"><ChIcon className="h-4 w-4 text-zinc-400" /></td>
                          <td className="py-3 px-4"><StatusBadge kind="ticket" value={tk.status} /></td>
                          <td className="py-3 px-4">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${priorityCls[tk.priority]}`}>{priorityLabel[tk.priority]}</span>
                          </td>
                          <td className="py-3 px-4 text-sm font-bold text-zinc-500">{timeSince(tk.createdAt)}</td>
                          <td className="py-3 px-4 text-center">
                            <button onClick={() => setSelected(tk)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 hover:text-[#9933c1] dark:hover:text-[#b3ff6b] transition-colors cursor-pointer">
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'kb' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Consultas sin respuesta detectadas por el bot, agrupadas por frecuencia. Las que superan el umbral (≥5) se sugieren como FAQ.</p>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Consulta</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Categoría</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Frecuencia</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {MOCK_KB_SUGGESTIONS.map((kb) => (
                  <tr key={kb.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-zinc-900 dark:text-white font-medium max-w-[300px]">{kb.query}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-[#9933c1]/10 text-[#9933c1] dark:bg-[#9933c1]/20 dark:text-[#b3ff6b]">{kb.category}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-black text-zinc-900 dark:text-white">{kb.frequency}</span>
                      {kb.suggestedForFaq && (
                        <span className="ml-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]">Sugerido</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <QuieroButton variant="secondary" className="text-[11px] py-1.5 px-3">
                        <BookOpen className="h-3 w-3 mr-1" /> Agregar al KB
                      </QuieroButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ticket Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-white/10 shadow-2xl flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-zinc-200 dark:border-white/10 shrink-0">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">{selected.id} — {selected.subject}</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">{selected.customerName} · {selected.customerEmail}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 cursor-pointer"><X className="h-5 w-5" /></button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge kind="ticket" value={selected.status} />
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${priorityCls[selected.priority]}`}>{priorityLabel[selected.priority]}</span>
                  {selected.agent && <span className="text-xs text-zinc-500">Agente: <strong className="text-zinc-700 dark:text-zinc-300">{selected.agent}</strong></span>}
                  {selected.orderId && <span className="text-xs text-zinc-500">Orden: <strong className="text-[#9933c1] dark:text-[#b3ff6b]">#{selected.orderId.slice(-4)}</strong></span>}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selected.messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.sender === 'customer' ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.sender === 'bot' ? 'bg-[#9933c1]/10 text-[#9933c1]' : msg.sender === 'agent' ? 'bg-[#b3ff6b]/30 text-green-900 dark:text-[#b3ff6b]' : 'bg-zinc-100 dark:bg-white/10 text-zinc-500'
                    }`}>
                      {msg.sender === 'bot' ? <Bot className="h-4 w-4" /> : msg.sender === 'agent' ? <HeadphonesIcon className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      msg.sender === 'customer' ? 'bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-white' : msg.sender === 'bot' ? 'bg-[#9933c1]/10 dark:bg-[#9933c1]/20 text-zinc-900 dark:text-white' : 'bg-[#b3ff6b]/20 text-zinc-900 dark:text-white'
                    }`}>
                      <p>{msg.text}</p>
                      <p className="text-[10px] text-zinc-400 mt-1.5">{new Date(msg.time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-zinc-200 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <input type="text" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Escribir respuesta..."
                    className="flex-1 px-4 py-3 text-sm bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30 transition-all" />
                  <QuieroButton variant="primary" className="py-3 px-4" onClick={() => setReply('')}>
                    <Send className="h-4 w-4" />
                  </QuieroButton>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
