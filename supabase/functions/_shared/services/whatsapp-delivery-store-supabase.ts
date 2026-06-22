import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmailLang } from '../email/templates.ts';
import {
  CRON_BACKOFF_MS,
  CRON_MAX_ATTEMPTS,
  type QrHosting,
  type WhatsappDeliveryRecord,
  type WhatsappDeliveryStore,
  type WhatsappEsimRecord,
} from './whatsapp-delivery.ts';

/**
 * WhatsappDeliveryStore + QrHosting sobre Supabase (service_role — corre SOLO en
 * Edge Functions). La fila qr_delivery (unique esim_id+channel) channel='whatsapp'
 * es el árbitro de idempotencia, espejo del store de email.
 */

// deno-lint-ignore no-explicit-any
type AnyClient = SupabaseClient<any, 'public', any>;

const CHANNEL = 'whatsapp';
const QR_BUCKET = 'qr-media';
const SIGNED_TTL_SECONDS = 600; // 10 min: ventana para que Twilio levante la media
const PURGE_AFTER_MS = 60 * 60 * 1000; // borrar PNGs de más de 1 h

function toRecord(row: {
  id: string;
  esim_id: string;
  status: string | null;
  resend_count: number | null;
  last_attempt_at: string | null;
}): WhatsappDeliveryRecord {
  return {
    id: row.id,
    esimId: row.esim_id,
    status: (row.status ?? 'pending') as WhatsappDeliveryRecord['status'],
    resendCount: row.resend_count ?? 0,
    lastAttemptAt: row.last_attempt_at,
  };
}

export function createSupabaseWhatsappStore(supabase: AnyClient): WhatsappDeliveryStore {
  return {
    async getEsimForDelivery(esimId: string): Promise<WhatsappEsimRecord | null> {
      const { data } = await supabase
        .from('esim')
        .select('id, qr_lpa, order:order_id(id, guest_phone, lang, status, plan:plan_id(name))')
        .eq('id', esimId)
        .maybeSingle();
      if (!data) return null;
      const order = Array.isArray(data.order) ? data.order[0] : data.order;
      if (!order) return null;
      const plan = Array.isArray(order.plan) ? order.plan[0] : order.plan;
      return {
        esimId: data.id,
        orderId: order.id,
        phone: order.guest_phone,
        lang: (order.lang ?? 'ES') as EmailLang,
        planName: plan?.name ?? 'eSIM QuieroSIM',
        lpa: data.qr_lpa,
        orderStatus: order.status ?? 'pending',
      };
    },

    async getOrCreateDelivery(esimId: string): Promise<WhatsappDeliveryRecord> {
      const { data: existing } = await supabase
        .from('qr_delivery')
        .select('id, esim_id, status, resend_count, last_attempt_at')
        .eq('esim_id', esimId)
        .eq('channel', CHANNEL)
        .maybeSingle();
      if (existing) return toRecord(existing);

      const { data: created, error } = await supabase
        .from('qr_delivery')
        .insert({ esim_id: esimId, channel: CHANNEL, status: 'pending' })
        .select('id, esim_id, status, resend_count, last_attempt_at')
        .single();
      if (error || !created) {
        // Carrera con otra invocación: el unique ganó — releer.
        const { data: raced } = await supabase
          .from('qr_delivery')
          .select('id, esim_id, status, resend_count, last_attempt_at')
          .eq('esim_id', esimId)
          .eq('channel', CHANNEL)
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
        .eq('channel', CHANNEL)
        .in('status', ['pending', 'failed'])
        .lt('resend_count', CRON_MAX_ATTEMPTS)
        .or(`last_attempt_at.is.null,last_attempt_at.lt.${cutoff}`)
        .order('last_attempt_at', { ascending: true, nullsFirst: true })
        .limit(limit);
      return (data ?? []).map((row: { esim_id: string }) => row.esim_id);
    },
  };
}

/** Decodifica base64 → bytes (sin Buffer, válido en Deno y Node). */
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * QrHosting sobre Supabase Storage (bucket privado `qr-media`). Sube el PNG y
 * devuelve una URL firmada de TTL corto para que Twilio la levante; purgeOld
 * limpia los objetos vencidos (la firma ya expiró, pero es higiene del bucket).
 */
export function createSupabaseQrHosting(supabase: AnyClient): QrHosting {
  const bucket = supabase.storage.from(QR_BUCKET);
  return {
    async hostQr(deliveryId: string, pngBase64: string): Promise<string> {
      const path = `${deliveryId}.png`;
      const { error: upErr } = await bucket.upload(path, base64ToBytes(pngBase64), {
        contentType: 'image/png',
        upsert: true,
      });
      if (upErr) throw new Error(`qr upload falló: ${upErr.message}`);
      const { data, error } = await bucket.createSignedUrl(path, SIGNED_TTL_SECONDS);
      if (error || !data?.signedUrl) throw new Error(`signed url falló: ${error?.message ?? 'sin url'}`);
      return data.signedUrl;
    },

    async purgeOld(): Promise<number> {
      const { data: items } = await bucket.list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'asc' },
      });
      const cutoff = Date.now() - PURGE_AFTER_MS;
      const stale = (items ?? [])
        .filter((o: { name: string; created_at?: string | null }) =>
          o.created_at ? new Date(o.created_at).getTime() < cutoff : false,
        )
        .map((o: { name: string }) => o.name);
      if (stale.length) await bucket.remove(stale);
      return stale.length;
    },
  };
}
