'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, LifeBuoy, X, Loader2, Search, CheckCircle2, Clock } from 'lucide-react';
import QuieroButton from '@/components/ui/QuieroButton';

type MockTicket = {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
};

const INITIAL_MOCKS: MockTicket[] = [
  { id: 'TKT-10492', subject: 'Problema con la activación en España', status: 'resolved', createdAt: '2026-06-20T14:30:00Z' },
  { id: 'TKT-10834', subject: 'Duda sobre recarga de datos', status: 'open', createdAt: new Date().toISOString() },
];

export default function SupportTicketsMock() {
  const [tickets, setTickets] = useState<MockTicket[]>(INITIAL_MOCKS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    // Simular latencia de red
    await new Promise(r => setTimeout(r, 1500));
    
    const newTicket: MockTicket = {
      id: `TKT-${Math.floor(10000 + Math.random() * 90000)}`,
      subject: subject,
      status: 'open',
      createdAt: new Date().toISOString()
    };

    setTickets([newTicket, ...tickets]);
    setIsSubmitting(false);
    setIsModalOpen(false);
    setSubject('');
    setMessage('');
  };

  const statusColors = {
    open: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    resolved: 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]',
  };

  const statusLabels = {
    open: 'Abierto',
    in_progress: 'En Proceso',
    resolved: 'Resuelto'
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
        
        {/* Encabezado y Acción */}
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar tickets..."
              disabled
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9933c1] dark:text-white"
            />
          </div>
          <QuieroButton 
            variant="secondary"
            className="px-6 py-2.5 whitespace-nowrap"
            onClick={() => setIsModalOpen(true)}
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Nuevo Ticket
            </span>
          </QuieroButton>
        </div>

        {/* Lista de Tickets Mock */}
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          <AnimatePresence>
            {tickets.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-zinc-500">
                <LifeBuoy className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No tienes tickets de soporte activos.</p>
              </div>
            ) : (
              tickets.map((tkt, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={tkt.id} 
                  className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {tkt.status === 'resolved' ? (
                        <CheckCircle2 className="h-5 w-5 text-[#9933c1] dark:text-[#b3ff6b]" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-[#9933c1] dark:group-hover:text-[#b3ff6b] transition-colors">
                        {tkt.subject}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-zinc-400">
                        <span className="font-mono text-xs opacity-70">#{tkt.id}</span>
                        <span>•</span>
                        <span>{new Date(tkt.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColors[tkt.status]}`}>
                      {statusLabels[tkt.status]}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal Creación Ticket (Mock) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-white/10"
            >
              <button 
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="mb-8">
                <h3 className="text-2xl font-black tracking-tight dark:text-white">Crear Ticket</h3>
                <p className="text-slate-500 dark:text-zinc-400 mt-1">
                  Describí tu problema y te responderemos a la brevedad.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                    Asunto
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Ej. Mi eSIM no se conecta en destino"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1] transition-shadow disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                    Mensaje detallado
                  </label>
                  <textarea
                    required
                    disabled={isSubmitting}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Incluí el modelo de tu teléfono y cualquier otro detalle..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1] transition-shadow resize-none disabled:opacity-50"
                  />
                </div>

                <div className="pt-4">
                  <QuieroButton 
                    type="submit" 
                    className="w-full !py-3.5"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Enviando...
                      </span>
                    ) : (
                      'Enviar Solicitud'
                    )}
                  </QuieroButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
