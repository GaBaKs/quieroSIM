/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HeadphonesIcon, BookOpen, Search, X, MessageSquare, Plus, Mail, MessageCircle, AlertCircle, Send, CheckCircle2 } from 'lucide-react';
import QuieroButton from '@/components/ui/QuieroButton';

type TicketStatus = 'open' | 'in_progress' | 'resolved';
type Priority = 'low' | 'normal' | 'high';
type Channel = 'web' | 'email' | 'whatsapp';

interface Ticket {
  id: string;
  client: string;
  email: string;
  channel: Channel;
  status: TicketStatus;
  priority: Priority;
  agent?: string;
  time: string;
}

const mockTickets: Ticket[] = [
  { id: 'TKT-10492', client: 'Carlos Perez', email: 'carlos@ejemplo.com', channel: 'web', status: 'open', priority: 'high', time: '10m' },
  { id: 'TKT-10834', client: 'Maria Gomez', email: 'maria@ejemplo.com', channel: 'whatsapp', status: 'in_progress', priority: 'normal', agent: 'Soporte 1', time: '2h' },
  { id: 'TKT-10901', client: 'John Doe', email: 'john@doe.com', channel: 'email', status: 'resolved', priority: 'low', agent: 'Soporte 2', time: '1d' },
];

const mockKB = [
  { id: 'KB-01', query: '¿Cómo activar en Japón?', count: 145, suggested: true },
  { id: 'KB-02', query: '¿Puedo compartir internet (Tethering)?', count: 89, suggested: true },
  { id: 'KB-03', query: 'Error de red "Sin Servicio" en iPhone', count: 42, suggested: false },
];

export default function SupportAdminMock() {
  const [tab, setTab] = useState<'tickets' | 'kb'>('tickets');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');

  const getPriorityBadge = (p: Priority) => {
    switch(p) {
      case 'high': return <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"><AlertCircle className="h-3 w-3" /> Alta</span>;
      case 'normal': return <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">Media</span>;
      case 'low': return <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400">Baja</span>;
    }
  };

  const getChannelIcon = (c: Channel) => {
    switch(c) {
      case 'web': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'email': return <Mail className="h-4 w-4 text-zinc-500" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <>
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/10 overflow-x-auto mb-6">
        <button onClick={() => setTab('tickets')} className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap ${tab === 'tickets' ? 'border-[#9933c1] text-[#9933c1] dark:text-[#b3ff6b] dark:border-[#b3ff6b]' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
          <HeadphonesIcon className="h-4 w-4" /> Tickets Activos
        </button>
        <button onClick={() => setTab('kb')} className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap ${tab === 'kb' ? 'border-[#9933c1] text-[#9933c1] dark:text-[#b3ff6b] dark:border-[#b3ff6b]' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
          <BookOpen className="h-4 w-4" /> Base de Conocimientos (IA)
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 shadow-sm overflow-hidden min-h-[400px]">
        {tab === 'tickets' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Toolbar */}
            <div className="p-5 border-b border-zinc-200 dark:border-white/10 flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                <input type="text" placeholder="Buscar ticket por ID o cliente..." className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9933c1] dark:text-white" />
              </div>
              <div className="flex gap-2">
                <select className="px-4 py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9933c1] dark:text-white">
                  <option value="all">Todos los estados</option>
                  <option value="open">Abiertos</option>
                  <option value="in_progress">En progreso</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                    <th className="py-3 px-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Ticket</th>
                    <th className="py-3 px-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Cliente</th>
                    <th className="py-3 px-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Prioridad</th>
                    <th className="py-3 px-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                    <th className="py-3 px-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Agente</th>
                    <th className="py-3 px-5 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Tiempo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {mockTickets.map(tkt => (
                    <tr key={tkt.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedTicket(tkt)}>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2">
                          {getChannelIcon(tkt.channel)}
                          <span className="font-mono text-xs font-bold text-[#9933c1] dark:text-[#b3ff6b]">#{tkt.id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <p className="font-bold text-sm text-zinc-900 dark:text-white">{tkt.client}</p>
                        <p className="text-xs text-zinc-500">{tkt.email}</p>
                      </td>
                      <td className="py-3 px-5">{getPriorityBadge(tkt.priority)}</td>
                      <td className="py-3 px-5">
                        <span className={`text-[10px] uppercase font-black tracking-wide ${tkt.status === 'open' ? 'text-amber-500' : tkt.status === 'in_progress' ? 'text-blue-500' : 'text-green-500'}`}>
                          {tkt.status === 'open' ? 'Abierto' : tkt.status === 'in_progress' ? 'En progreso' : 'Resuelto'}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-sm text-zinc-600 dark:text-zinc-300">
                        {tkt.agent ? (
                          <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" /> {tkt.agent}</span>
                        ) : (
                          <span className="text-zinc-400 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right text-sm text-zinc-500">{tkt.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 'kb' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Consultas no resueltas por el Bot IA</h3>
              <p className="text-sm text-zinc-500 mb-6">Estas son las preguntas más frecuentes que el bot no supo responder y derivó a un humano. Agregá la respuesta a la Base de Conocimientos para entrenar a la IA.</p>
              
              <div className="space-y-3">
                {mockKB.map(kb => (
                  <div key={kb.id} className="bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">"{kb.query}"</span>
                        {kb.suggested && <span className="text-[10px] uppercase font-black bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b] px-2 py-0.5 rounded-full tracking-wider">Sugerido</span>}
                      </div>
                      <p className="text-xs text-zinc-500">Apareció {kb.count} veces en los últimos 7 días</p>
                    </div>
                    <QuieroButton variant="secondary" className="px-4 py-2 text-sm whitespace-nowrap">
                      <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Agregar a KB</span>
                    </QuieroButton>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Ticket Detail Drawer/Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTicket(null)} />
            
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-lg h-full bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-white/10 flex flex-col">
              
              {/* Header */}
              <div className="p-6 border-b border-zinc-200 dark:border-white/10 flex items-start justify-between bg-zinc-50 dark:bg-black/30">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-[#9933c1] dark:text-[#b3ff6b]">#{selectedTicket.id}</span>
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{selectedTicket.client}</h2>
                  <p className="text-sm text-zinc-500">{selectedTicket.email}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-xs font-bold bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b] rounded-lg flex items-center gap-1 hover:bg-[#b3ff6b]/50 transition-colors">
                    <CheckCircle2 className="h-4 w-4" /> Resolver
                  </button>
                  <button onClick={() => setSelectedTicket(null)} className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg bg-white dark:bg-zinc-800 transition-colors shadow-sm">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Chat Timeline */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Bot Message */}
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#9933c1] text-white flex items-center justify-center shrink-0">
                    <HeadphonesIcon className="h-4 w-4" />
                  </div>
                  <div className="bg-zinc-100 dark:bg-white/5 rounded-2xl rounded-tl-sm p-4 text-sm text-zinc-800 dark:text-zinc-200">
                    ¡Hola! Soy el asistente virtual de QuieroSIM. ¿En qué te puedo ayudar hoy?
                  </div>
                </div>

                {/* User Message */}
                <div className="flex gap-3 flex-row-reverse">
                  <div className="h-8 w-8 rounded-full bg-zinc-300 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 font-bold text-xs">
                    {selectedTicket.client.charAt(0)}
                  </div>
                  <div className="bg-[#9933c1]/10 dark:bg-[#b3ff6b]/10 rounded-2xl rounded-tr-sm p-4 text-sm text-zinc-900 dark:text-white">
                    Tengo problemas para activar mi eSIM en destino. Me dice "Sin servicio". Mi teléfono es un iPhone 15.
                  </div>
                </div>
                
                {/* System Event */}
                <div className="flex justify-center">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-50 dark:bg-black/30 px-3 py-1 rounded-full">
                    El Bot IA transfirió la conversación a un agente humano
                  </span>
                </div>

              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900">
                <div className="relative">
                  <textarea 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe una respuesta para el cliente..."
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1] resize-none pr-12"
                    rows={3}
                  />
                  <button className="absolute bottom-3 right-3 p-2 bg-[#9933c1] text-white rounded-lg hover:bg-[#7100a5] transition-colors disabled:opacity-50" disabled={!replyText.trim()}>
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex justify-between items-center text-xs text-zinc-500">
                  <span>Presiona <kbd className="font-mono bg-zinc-100 dark:bg-white/10 px-1 py-0.5 rounded">Cmd + Enter</kbd> para enviar</span>
                  <button className="hover:text-zinc-900 dark:hover:text-white underline">Usar plantilla</button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
