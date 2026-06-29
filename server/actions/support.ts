'use server';

import { z } from 'zod';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';
import { getOrderStatus } from './checkout';
import { resendQrEmail } from './esims';
import { getSupportedDevices } from '../services/catalog';

/**
 * Fachada de Soporte (lado usuario). v1 SIN LLM: búsqueda full-text de la base de
 * conocimiento (RPC search_kb) + asistente guiado (S2). El front solo conoce
 * estas actions. La columna kb_article.embedding queda reservada para el LLM futuro.
 */

export interface KbArticle {
  id: string;
  title: string;
  content: string;
  category: string | null;
}

const searchSchema = z.object({ query: z.string().trim().min(2).max(200) });

/** Busca artículos de ayuda por texto (tolerante a tildes y typos). Pública (apta guests). */
export async function searchKb(input: { query: string }): Promise<Result<KbArticle[]>> {
  const parsed = parseInput(searchSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('search_kb' as never, {
    p_query: parsed.data.query,
    p_limit: 5,
  } as never);
  if (error) {
    logger.error('searchKb falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos buscar en la ayuda. Intentá de nuevo.');
  }

  const rows = (data ?? []) as Array<{ id: string; title: string; content: string; category: string | null }>;

  // Sin resultados → registramos la consulta para detectar FAQs faltantes (RF-SUP-07).
  // La RPC es 'authenticated'; los guests no la disparan (no pasa nada si falla).
  if (rows.length === 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.rpc('support_log_unresolved' as never, { p_query: parsed.data.query, p_category: null } as never);
    }
  }

  return ok(rows.map((r) => ({ id: r.id, title: r.title, content: r.content, category: r.category })));
}

// ── Asistente guiado determinístico (stateless, sin LLM) ─────────────────────
// Las consultas casuales NO crean ticket: el bot invoca operaciones que ya
// existen y devuelve datos estructurados; el cliente los renderiza con i18n.

export type SupportIntent = 'order_status' | 'resend_qr' | 'compatibility' | 'plans';

export type AssistantReply =
  | { kind: 'order_status'; orderStatus: string; provisionState: string | null; hasQr: boolean }
  | { kind: 'qr_resent' }
  | { kind: 'compatibility'; brands: Array<{ brand: string; models: string[] }> }
  | { kind: 'plans' }
  | { kind: 'kb'; articles: KbArticle[] };

const assistantSchema = z.object({
  intent: z.enum(['order_status', 'resend_qr', 'compatibility', 'plans']).optional(),
  freeText: z.string().trim().max(200).optional(),
  orderId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  esimId: z.string().uuid().optional(),
});

/** Responde una consulta del asistente: por intención (operación real) o por texto libre (KB). */
export async function assistantReply(input: {
  intent?: SupportIntent;
  freeText?: string;
  orderId?: string;
  email?: string;
  esimId?: string;
}): Promise<Result<AssistantReply>> {
  const parsed = parseInput(assistantSchema, input);
  if (!parsed.ok) return parsed;
  const { intent, freeText, orderId, email, esimId } = parsed.data;

  switch (intent) {
    case 'order_status': {
      if (!orderId || !email) return err(ErrorCodes.VALIDATION, 'Necesitamos tu número de orden y email.');
      const res = await getOrderStatus({ orderId, email });
      if (!res.ok) return res;
      return ok({ kind: 'order_status', orderStatus: res.data.orderStatus, provisionState: res.data.provisionState, hasQr: !!res.data.esim });
    }
    case 'resend_qr': {
      if (!esimId) return err(ErrorCodes.VALIDATION, 'Elegí la eSIM a la que querés reenviar el QR.');
      const res = await resendQrEmail({ esimId });
      if (!res.ok) return res;
      return ok({ kind: 'qr_resent' });
    }
    case 'compatibility': {
      const brands = await getSupportedDevices();
      return ok({ kind: 'compatibility', brands });
    }
    case 'plans':
      return ok({ kind: 'plans' });
    default: {
      // Texto libre → base de conocimiento.
      if (!freeText || freeText.length < 2) return err(ErrorCodes.VALIDATION, 'Escribí tu consulta.');
      const res = await searchKb({ query: freeText });
      if (!res.ok) return res;
      return ok({ kind: 'kb', articles: res.data });
    }
  }
}

// ── Tickets (se crean al escalar a humano o abrir un caso) ───────────────────

export interface TicketMessage {
  id: string;
  author: 'user' | 'bot' | 'agent' | 'system';
  body: string;
  at: string;
}

export interface MyTicket {
  id: string;
  status: string;
  priority: string;
  orderId: string | null;
  createdAt: string | null;
  resolvedAt: string | null;
  messages: TicketMessage[];
}

function parseMessages(raw: unknown): TicketMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map((m) => ({
      id: String(m.id ?? ''),
      author: (['user', 'bot', 'agent', 'system'].includes(String(m.author)) ? m.author : 'system') as TicketMessage['author'],
      body: String(m.body ?? ''),
      at: String(m.at ?? ''),
    }));
}

const createTicketSchema = z.object({
  firstMessage: z.string().trim().min(2).max(2000),
  orderId: z.string().uuid().optional(),
});

/** Abre un ticket de soporte humano (requiere sesión). El primer mensaje queda en el historial. */
export async function createSupportTicket(input: { firstMessage: string; orderId?: string }): Promise<Result<{ ticketId: string }>> {
  const parsed = parseInput(createTicketSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(ErrorCodes.UNAUTHORIZED, 'Iniciá sesión para abrir un caso de soporte.');

  const firstMsg = {
    id: crypto.randomUUID(),
    author: 'user' as const,
    body: parsed.data.firstMessage,
    meta: {},
    at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('support_ticket')
    .insert({
      user_id: user.id,
      order_id: parsed.data.orderId ?? null,
      channel: 'web',
      status: 'open',
      priority: 'normal',
      bot_conversation_history: [firstMsg],
    })
    .select('id')
    .single();
  if (error || !data) {
    logger.error('createSupportTicket falló', { error: error?.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos abrir el caso. Intentá de nuevo.');
  }
  return ok({ ticketId: data.id });
}

/** Tickets del usuario logueado (RLS los limita a los propios). */
export async function getMyTickets(): Promise<Result<MyTicket[]>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(ErrorCodes.UNAUTHORIZED, 'Iniciá sesión para ver tus casos.');

  const { data, error } = await supabase
    .from('support_ticket')
    .select('id, status, priority, order_id, created_at, resolved_at, bot_conversation_history')
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('getMyTickets falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar tus casos.');
  }
  return ok(
    (data ?? []).map((t) => ({
      id: t.id,
      status: t.status ?? 'open',
      priority: t.priority ?? 'normal',
      orderId: t.order_id,
      createdAt: t.created_at,
      resolvedAt: t.resolved_at,
      messages: parseMessages(t.bot_conversation_history),
    })),
  );
}

const ticketIdSchema = z.object({ ticketId: z.string().uuid() });

/** Un ticket del usuario con su conversación. */
export async function getTicket(input: { ticketId: string }): Promise<Result<MyTicket>> {
  const parsed = parseInput(ticketIdSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('support_ticket')
    .select('id, status, priority, order_id, created_at, resolved_at, bot_conversation_history')
    .eq('id', parsed.data.ticketId)
    .maybeSingle();
  if (error) {
    logger.error('getTicket falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar el caso.');
  }
  if (!data) return err(ErrorCodes.NOT_FOUND, 'Caso no encontrado.');
  return ok({
    id: data.id,
    status: data.status ?? 'open',
    priority: data.priority ?? 'normal',
    orderId: data.order_id,
    createdAt: data.created_at,
    resolvedAt: data.resolved_at,
    messages: parseMessages(data.bot_conversation_history),
  });
}

const sendMsgSchema = z.object({ ticketId: z.string().uuid(), body: z.string().trim().min(1).max(2000) });

/** Agrega un mensaje del usuario a un ticket existente. */
export async function sendTicketMessage(input: { ticketId: string; body: string }): Promise<Result<{ message: TicketMessage }>> {
  const parsed = parseInput(sendMsgSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('support_append_message' as never, {
    p_ticket_id: parsed.data.ticketId,
    p_author: 'user',
    p_body: parsed.data.body,
  } as never);
  if (error) {
    logger.error('sendTicketMessage falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos enviar el mensaje.');
  }
  const r = data as { ok?: boolean; reason?: string; message?: Record<string, unknown> } | null;
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No se pudo enviar.');
  const m = r.message ?? {};
  return ok({ message: { id: String(m.id ?? ''), author: 'user', body: String(m.body ?? ''), at: String(m.at ?? '') } });
}
