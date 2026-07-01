'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';
import { requireAdmin } from '../lib/admin-guard';

/**
 * Gestión de Soporte (admin / support_agent). requireAdmin cubre a ambos;
 * no toca finanzas (RF-ADM-07). El agente lee/responde tickets por RLS
 * (ticket_sel/upd con is_admin()) y administra la base de conocimiento.
 */

export interface AdminTicketMessage {
  id: string;
  author: 'user' | 'bot' | 'agent' | 'system';
  body: string;
  at: string;
}

export interface AdminTicketRow {
  id: string;
  status: string;
  priority: string;
  userName: string | null;
  userEmail: string | null;
  orderId: string | null;
  createdAt: string | null;
  resolvedAt: string | null;
  slaDeadline: string | null;
  lastMessage: string | null;
  messageCount: number;
}

export interface AdminTicketDetail extends AdminTicketRow {
  messages: AdminTicketMessage[];
}

function parseMessages(raw: unknown): AdminTicketMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map((m) => ({
      id: String(m.id ?? ''),
      author: (['user', 'bot', 'agent', 'system'].includes(String(m.author)) ? m.author : 'system') as AdminTicketMessage['author'],
      body: String(m.body ?? ''),
      at: String(m.at ?? ''),
    }));
}

// deno-lint-ignore no-explicit-any
function userOf(row: any): { email: string | null; full_name: string | null } | null {
  const up = Array.isArray(row.user_profile) ? row.user_profile[0] : row.user_profile;
  return up ?? null;
}

const listSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
});

/** Lista de tickets para el panel de agentes (RLS: is_admin ve todos). */
export async function getAdminTickets(input: { status?: string; priority?: string } = {}): Promise<Result<AdminTicketRow[]>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(listSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('support_ticket')
    .select('id, status, priority, order_id, created_at, resolved_at, sla_deadline, bot_conversation_history, user_profile:user_id(email, full_name)')
    .order('created_at', { ascending: false });
  if (parsed.data.status) query = query.eq('status', parsed.data.status);
  if (parsed.data.priority) query = query.eq('priority', parsed.data.priority);

  const { data, error } = await query;
  if (error) {
    logger.error('getAdminTickets falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar los tickets.');
  }
  const rows: AdminTicketRow[] = (data ?? []).map((t) => {
    const up = userOf(t);
    const msgs = parseMessages(t.bot_conversation_history);
    return {
      id: t.id,
      status: t.status ?? 'open',
      priority: t.priority ?? 'normal',
      userName: up?.full_name ?? null,
      userEmail: up?.email ?? null,
      orderId: t.order_id,
      createdAt: t.created_at,
      resolvedAt: t.resolved_at,
      slaDeadline: t.sla_deadline,
      lastMessage: msgs.length ? msgs[msgs.length - 1].body : null,
      messageCount: msgs.length,
    };
  });
  return ok(rows);
}

const idSchema = z.object({ ticketId: z.string().uuid() });

/** Un ticket con su conversación completa (admin). */
export async function getAdminTicket(input: { ticketId: string }): Promise<Result<AdminTicketDetail>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(idSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { data: t, error } = await supabase
    .from('support_ticket')
    .select('id, status, priority, order_id, created_at, resolved_at, sla_deadline, bot_conversation_history, user_profile:user_id(email, full_name)')
    .eq('id', parsed.data.ticketId)
    .maybeSingle();
  if (error) {
    logger.error('getAdminTicket falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar el ticket.');
  }
  if (!t) return err(ErrorCodes.NOT_FOUND, 'Ticket no encontrado.');
  const up = userOf(t);
  const messages = parseMessages(t.bot_conversation_history);
  return ok({
    id: t.id,
    status: t.status ?? 'open',
    priority: t.priority ?? 'normal',
    userName: up?.full_name ?? null,
    userEmail: up?.email ?? null,
    orderId: t.order_id,
    createdAt: t.created_at,
    resolvedAt: t.resolved_at,
    slaDeadline: t.sla_deadline,
    lastMessage: messages.length ? messages[messages.length - 1].body : null,
    messageCount: messages.length,
    messages,
  });
}

const replySchema = z.object({ ticketId: z.string().uuid(), body: z.string().trim().min(1).max(4000) });

/** El agente responde el ticket (append 'agent' + pasa a in_progress). */
export async function replyToTicket(input: { ticketId: string; body: string }): Promise<Result<null>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(replySchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('support_append_message' as never, {
    p_ticket_id: parsed.data.ticketId,
    p_author: 'agent',
    p_body: parsed.data.body,
  } as never);
  if (error) {
    logger.error('replyToTicket falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos enviar la respuesta.');
  }
  const r = data as { ok?: boolean; reason?: string } | null;
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No se pudo responder.');
  // Pasa a "en progreso" si estaba abierto (RLS ticket_upd: is_admin()).
  await supabase.from('support_ticket').update({ status: 'in_progress' }).eq('id', parsed.data.ticketId).eq('status', 'open');
  revalidatePath('/admin/support');
  return ok(null);
}

const statusSchema = z.object({ ticketId: z.string().uuid(), status: z.enum(['in_progress', 'resolved', 'closed']) });

/** Cambia el estado del ticket (resolver/cerrar/retomar). */
export async function setTicketStatus(input: { ticketId: string; status: 'in_progress' | 'resolved' | 'closed' }): Promise<Result<null>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(statusSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const patch: { status: string; resolved_at?: string | null } = { status: parsed.data.status };
  if (parsed.data.status === 'resolved' || parsed.data.status === 'closed') patch.resolved_at = new Date().toISOString();
  else patch.resolved_at = null;
  const { error } = await supabase.from('support_ticket').update(patch).eq('id', parsed.data.ticketId);
  if (error) {
    logger.error('setTicketStatus falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cambiar el estado.');
  }
  await supabase.rpc('support_append_message' as never, {
    p_ticket_id: parsed.data.ticketId,
    p_author: 'system',
    p_body: parsed.data.status === 'resolved' ? 'Caso resuelto.' : parsed.data.status === 'closed' ? 'Caso cerrado.' : 'Caso reabierto.',
  } as never);
  revalidatePath('/admin/support');
  return ok(null);
}

const prioritySchema = z.object({ ticketId: z.string().uuid(), priority: z.enum(['low', 'normal', 'high', 'critical']) });

/** El agente asigna la prioridad del caso (afecta el SLA mostrado y el orden). */
export async function setTicketPriority(input: { ticketId: string; priority: 'low' | 'normal' | 'high' | 'critical' }): Promise<Result<null>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(prioritySchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  // SLA según prioridad: critical 2h, high 8h, normal 24h, low 72h.
  const hours = parsed.data.priority === 'critical' ? 2 : parsed.data.priority === 'high' ? 8 : parsed.data.priority === 'normal' ? 24 : 72;
  const sla = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  const { error } = await supabase.from('support_ticket').update({ priority: parsed.data.priority, sla_deadline: sla }).eq('id', parsed.data.ticketId);
  if (error) {
    logger.error('setTicketPriority falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cambiar la prioridad.');
  }
  revalidatePath('/admin/support');
  return ok(null);
}

// ── Reembolso: iniciar (soporte) / aprobar (super_admin) — RF-SUP-05 ─────────

const refundReqSchema = z.object({ ticketId: z.string().uuid(), reason: z.string().trim().max(500).optional() });

/** El agente INICIA una solicitud de reembolso (no la ejecuta). La aprobación y el
 *  refund real los hace un super_admin con refundOrder() (admin-orders.ts → Stripe). */
export async function requestRefund(input: { ticketId: string; reason?: string }): Promise<Result<null>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(refundReqSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const note = `Reembolso solicitado por el agente${parsed.data.reason ? `: ${parsed.data.reason}` : ''}. Pendiente de aprobación de un administrador.`;
  const { data, error } = await supabase.rpc('support_append_message' as never, {
    p_ticket_id: parsed.data.ticketId,
    p_author: 'system',
    p_body: note,
  } as never);
  if (error) {
    logger.error('requestRefund falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos registrar la solicitud.');
  }
  const r = data as { ok?: boolean; reason?: string } | null;
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No se pudo registrar.');
  await supabase.from('support_ticket').update({ priority: 'high' }).eq('id', parsed.data.ticketId);
  revalidatePath('/admin/support');
  return ok(null);
}

// ── Base de conocimiento (admin) ─────────────────────────────────────────────

export interface AdminKbArticle {
  id: string;
  title: string;
  content: string;
  titleEn: string | null;
  contentEn: string | null;
  titlePt: string | null;
  contentPt: string | null;
  category: string | null;
  updatedAt: string | null;
}

export async function getKbArticles(): Promise<Result<AdminKbArticle[]>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('kb_article')
    .select('id, title, content, title_en, content_en, title_pt, content_pt, category, updated_at')
    .order('updated_at', { ascending: false });
  if (error) {
    logger.error('getKbArticles falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar la base de conocimiento.');
  }
  return ok(
    (data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      titleEn: a.title_en,
      contentEn: a.content_en,
      titlePt: a.title_pt,
      contentPt: a.content_pt,
      category: a.category,
      updatedAt: a.updated_at,
    })),
  );
}

const upsertKbSchema = z.object({
  id: z.string().uuid().optional(),
  // ES es el idioma base (obligatorio); EN/PT opcionales.
  title: z.string().trim().min(3).max(200),
  content: z.string().trim().min(10).max(20000),
  titleEn: z.string().trim().max(200).optional(),
  contentEn: z.string().trim().max(20000).optional(),
  titlePt: z.string().trim().max(200).optional(),
  contentPt: z.string().trim().max(20000).optional(),
  category: z.string().trim().max(60).optional(),
});

export async function upsertKbArticle(input: {
  id?: string; title: string; content: string;
  titleEn?: string; contentEn?: string; titlePt?: string; contentPt?: string; category?: string;
}): Promise<Result<{ id: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(upsertKbSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const row = {
    title: parsed.data.title,
    content: parsed.data.content,
    title_en: parsed.data.titleEn || null,
    content_en: parsed.data.contentEn || null,
    title_pt: parsed.data.titlePt || null,
    content_pt: parsed.data.contentPt || null,
    category: parsed.data.category ?? null,
    updated_at: new Date().toISOString(),
  };
  const q = parsed.data.id
    ? supabase.from('kb_article').update(row).eq('id', parsed.data.id).select('id').single()
    : supabase.from('kb_article').insert(row).select('id').single();
  const { data, error } = await q;
  if (error || !data) {
    logger.error('upsertKbArticle falló', { error: error?.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos guardar el artículo.');
  }
  revalidatePath('/admin/support');
  return ok({ id: data.id });
}

export async function deleteKbArticle(input: { id: string }): Promise<Result<null>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(z.object({ id: z.string().uuid() }), input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('kb_article').delete().eq('id', parsed.data.id);
  if (error) {
    logger.error('deleteKbArticle falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos borrar el artículo.');
  }
  revalidatePath('/admin/support');
  return ok(null);
}

// ── Consultas sin respuesta (RF-SUP-07) ──────────────────────────────────────

export interface UnresolvedQuery {
  id: string;
  queryText: string;
  category: string | null;
  frequency: number;
  lastSeenAt: string | null;
}

export async function getUnresolvedQueries(): Promise<Result<UnresolvedQuery[]>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('unresolved_query')
    .select('id, query_text, category, frequency, last_seen_at')
    .order('frequency', { ascending: false })
    .limit(100);
  if (error) {
    logger.error('getUnresolvedQueries falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar las consultas sin respuesta.');
  }
  return ok((data ?? []).map((q) => ({ id: q.id, queryText: q.query_text, category: q.category, frequency: Number(q.frequency ?? 0), lastSeenAt: q.last_seen_at })));
}

/** Convierte una consulta sin respuesta en un artículo de KB y la quita de la cola. */
export async function promoteUnresolvedToKb(input: { queryId: string; title: string; content: string; category?: string }): Promise<Result<{ id: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(upsertKbSchema.extend({ queryId: z.string().uuid() }), input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('kb_article')
    .insert({ title: parsed.data.title, content: parsed.data.content, category: parsed.data.category ?? null })
    .select('id')
    .single();
  if (error || !data) {
    logger.error('promoteUnresolvedToKb falló', { error: error?.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos crear el artículo.');
  }
  await supabase.from('unresolved_query').delete().eq('id', parsed.data.queryId);
  revalidatePath('/admin/support');
  return ok({ id: data.id });
}
