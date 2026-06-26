// Orquestación de provisión + entrega del QR, compartida por stripe-webhook
// (orden pagada con Stripe) y checkout (orden gratis/cubierta 100% que NO pasa
// por Stripe). Un solo lugar para: crear el cliente YeSim, entregar el QR por
// email y WhatsApp, y correr la máquina de provisión con la entrega encadenada.

import { runProvision } from './provisioning.ts';
import { createSupabaseProvisionStore } from './provision-store-supabase.ts';
import { createYesimClient } from '../yesim/client.ts';
import { createYesimMock } from '../yesim/mock/handler.ts';
import { createResendClient } from '../email/resend.ts';
import { sendQrDelivery } from './delivery.ts';
import { createSupabaseDeliveryStore } from './delivery-store-supabase.ts';
import { createTwilioClient } from '../whatsapp/twilio.ts';
import { sendWhatsappDelivery } from './whatsapp-delivery.ts';
import {
  createSupabaseQrHosting,
  createSupabaseWhatsappStore,
} from './whatsapp-delivery-store-supabase.ts';

/** Cliente YeSim real o mock según YESIM_BASE_URL (mock = sin sandbox). */
export function makeYesim() {
  const baseUrl = Deno.env.get('YESIM_BASE_URL') ?? 'mock';
  const token = Deno.env.get('YESIM_TOKEN') ?? 'mock-token';
  const useMock = baseUrl === 'mock';
  return createYesimClient({
    baseUrl: useMock ? 'https://yesim.mock' : baseUrl,
    token,
    fetchFn: useMock ? createYesimMock({ token }).fetchHandler : undefined,
  });
}

/**
 * Entrega del QR por email. Sin RESEND_API_KEY la entrega queda
 * failed=RESEND_NOT_CONFIGURED y el cron process-qr-deliveries la levanta luego.
 */
// deno-lint-ignore no-explicit-any
export async function deliverQrForOrder(supabase: any, orderId: string): Promise<void> {
  try {
    const { data: esim } = await supabase.from('esim').select('id').eq('order_id', orderId).maybeSingle();
    if (!esim) return;
    const apiKey = Deno.env.get('RESEND_API_KEY');
    await sendQrDelivery(esim.id, {
      store: createSupabaseDeliveryStore(supabase),
      email: apiKey
        ? createResendClient({ apiKey, from: Deno.env.get('EMAIL_FROM') ?? 'QuieroSIM <onboarding@resend.dev>' })
        : null,
    });
  } catch (e) {
    // Jamás loguear el contenido del email (lleva el LPA); solo el motivo.
    console.error('qr delivery error', e instanceof Error ? e.message : String(e));
  }
}

/**
 * Segundo canal: QR por WhatsApp (Twilio) si la orden tiene guest_phone. Sin
 * secrets de Twilio el transporte es null y queda failed para el cron. No bloquea.
 */
// deno-lint-ignore no-explicit-any
export async function deliverQrWhatsappForOrder(supabase: any, orderId: string): Promise<void> {
  try {
    const { data: order } = await supabase
      .from('order')
      .select('guest_phone, esim(id)')
      .eq('id', orderId)
      .maybeSingle();
    const phone = (order?.guest_phone ?? '').trim();
    const esim = Array.isArray(order?.esim) ? order?.esim[0] : order?.esim;
    if (!phone || !esim) return;
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const from = Deno.env.get('TWILIO_WHATSAPP_FROM');
    await sendWhatsappDelivery(esim.id, {
      store: createSupabaseWhatsappStore(supabase),
      media: createSupabaseQrHosting(supabase),
      whatsapp:
        accountSid && authToken && from
          ? createTwilioClient({ accountSid, authToken, from })
          : null,
    });
  } catch (e) {
    // Jamás loguear el body/LPA/URL firmada; solo el motivo.
    console.error('whatsapp delivery error', e instanceof Error ? e.message : String(e));
  }
}

/**
 * Corre la máquina de provisión para una orden YA en estado 'paid' y, si quedó
 * fulfilled, entrega el QR por email + WhatsApp. Devuelve la promesa para que el
 * caller la envuelva en EdgeRuntime.waitUntil (background). Nunca rechaza.
 */
// deno-lint-ignore no-explicit-any
export function startProvisionAndDeliver(supabase: any, orderId: string): Promise<void> {
  return runProvision(orderId, {
    store: createSupabaseProvisionStore(supabase),
    yesim: makeYesim(),
  })
    .then(async (r) => {
      if (r.ok && r.data.state === 'fulfilled') {
        await deliverQrForOrder(supabase, orderId);
        await deliverQrWhatsappForOrder(supabase, orderId);
      }
    })
    .catch((e) => console.error('provision error', e instanceof Error ? e.message : String(e)));
}
