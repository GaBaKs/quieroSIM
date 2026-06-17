import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmailLang } from '../email/templates.ts';
import {
  CRON_BACKOFF_MS,
  CRON_MAX_ATTEMPTS,
  type DeliveryEsimRecord,
  type DeliveryStore,
  type QrDeliveryRecord,
} from './delivery.ts';

/**
 * DeliveryStore sobre Supabase (service_role — corre SOLO en Edge Functions).
 * La fila qr_delivery (unique esim_id+channel) es el árbitro de idempotencia.
 */

// deno-lint-ignore no-explicit-any
type AnyClient = SupabaseClient<any, 'public', any>;

function toRecord(row: { id: string; esim_id: string; status: string | null; resend_count: number | null; last_attempt_at: string | null }): QrDeliveryRecord {
  return {
    id: row.id,
    esimId: row.esim_id,
    status: (row.status ?? 'pending') as QrDeliveryRecord['status'],
    resendCount: row.resend_count ?? 0,
    lastAttemptAt: row.last_attempt_at,
  };
}

export function createSupabaseDeliveryStore(supabase: AnyClient): DeliveryStore {
  return {
    async getEsimForDelivery(esimId: string): Promise<DeliveryEsimRecord | null> {
      const { data } = await supabase
        .from('esim')
        .select('id, qr_lpa, ios_tap_link, order:order_id(id, guest_email, lang, status, plan:plan_id(name))')
        .eq('id', esimId)
        .maybeSingle();
      if (!data) return null;
      const order = Array.isArray(data.order) ? data.order[0] : data.order;
      if (!order) return null;
      const plan = Array.isArray(order.plan) ? order.plan[0] : order.plan;
      return {
        esimId: data.id,
        orderId: order.id,
        email: order.guest_email,
        lang: (order.lang ?? 'ES') as EmailLang,
        planName: plan?.name ?? 'eSIM QuieroSIM',
        lpa: data.qr_lpa,
        iosTapLink: data.ios_tap_link,
        orderStatus: order.status ?? 'pending',
      };
    },

    async getOrCreateDelivery(esimId: string): Promise<QrDeliveryRecord> {
      const { data: existing } = await supabase
        .from('qr_delivery')
        .select('id, esim_id, status, resend_count, last_attempt_at')
        .eq('esim_id', esimId)
        .eq('channel', 'email')
        .maybeSingle();
      if (existing) return toRecord(existing);

      const { data: created, error } = await supabase
        .from('qr_delivery')
        .insert({ esim_id: esimId, channel: 'email', status: 'pending' })
        .select('id, esim_id, status, resend_count, last_attempt_at')
        .single();
      if (error || !created) {
        // Carrera con otra invocación: el unique ganó — releer.
        const { data: raced } = await supabase
          .from('qr_delivery')
          .select('id, esim_id, status, resend_count, last_attempt_at')
          .eq('esim_id', esimId)
          .eq('channel', 'email')
          .single();
        if (!raced) throw new Error(`getOrCreateDelivery falló: ${error?.message ?? 'sin datos'}`);
        return toRecord(raced);
      }
      return toRecord(created);
    },

    async recordAttempt(deliveryId: string, countAttempt: boolean): Promise<void> {
      if (countAttempt) {
        const { data } = await supabase
          .from('qr_delivery')
          .select('resend_count')
          .eq('id', deliveryId)
          .single();
        await supabase
          .from('qr_delivery')
          .update({ resend_count: (data?.resend_count ?? 0) + 1, last_attempt_at: new Date().toISOString() })
          .eq('id', deliveryId);
      } else {
        await supabase
          .from('qr_delivery')
          .update({ last_attempt_at: new Date().toISOString() })
          .eq('id', deliveryId);
      }
    },

    async markSent(deliveryId: string, providerMessageId: string, langUsed: EmailLang): Promise<void> {
      await supabase
        .from('qr_delivery')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          lang_used: langUsed,
          provider_message_id: providerMessageId,
          last_error: null,
        })
        .eq('id', deliveryId);
    },

    async markFailed(deliveryId: string, errorMessage: string): Promise<void> {
      await supabase
        .from('qr_delivery')
        .update({ status: 'failed', last_error: errorMessage })
        .eq('id', deliveryId);
    },

    async listRetryable(limit: number): Promise<string[]> {
      const cutoff = new Date(Date.now() - CRON_BACKOFF_MS).toISOString();
      const { data } = await supabase
        .from('qr_delivery')
        .select('esim_id')
        .eq('channel', 'email')
        .in('status', ['pending', 'failed'])
        .lt('resend_count', CRON_MAX_ATTEMPTS)
        .or(`last_attempt_at.is.null,last_attempt_at.lt.${cutoff}`)
        .order('last_attempt_at', { ascending: true, nullsFirst: true })
        .limit(limit);
      return (data ?? []).map((row: { esim_id: string }) => row.esim_id);
    },
  };
}
