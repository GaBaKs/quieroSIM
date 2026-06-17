import type { SupabaseClient } from '@supabase/supabase-js';
import type { YesimEsim } from '../yesim/types.ts';
import type {
  EsimRecordRef,
  ProvisionJobRecord,
  ProvisionJobState,
  ProvisionOrderRecord,
  ProvisionStore,
} from './provisioning.ts';

/**
 * ProvisionStore sobre Supabase (service_role — corre SOLO en Edge Functions).
 * El lock optimista usa provision_job.locked_at: un lock vence a los 2 minutos
 * (una invocación colgada no bloquea para siempre el reintento manual).
 */

const LOCK_TTL_MS = 2 * 60 * 1000;

// deno-lint-ignore no-explicit-any
type AnyClient = SupabaseClient<any, 'public', any>;

export function createSupabaseProvisionStore(supabase: AnyClient): ProvisionStore {
  async function appendHistory(orderId: string, entry: Record<string, unknown>) {
    const { data } = await supabase.from('provision_job').select('history').eq('order_id', orderId).single();
    const history = Array.isArray(data?.history) ? data.history : [];
    history.push({ ...entry, at: new Date().toISOString() });
    await supabase.from('provision_job').update({ history }).eq('order_id', orderId);
  }

  return {
    async lockJob(orderId: string): Promise<ProvisionJobRecord | null> {
      const staleCutoff = new Date(Date.now() - LOCK_TTL_MS).toISOString();
      const { data, error } = await supabase
        .from('provision_job')
        .update({ locked_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .or(`locked_at.is.null,locked_at.lt.${staleCutoff}`)
        .select('order_id, state, attempt_count');
      if (error || !data || data.length === 0) return null;
      return {
        orderId: data[0].order_id,
        state: data[0].state as ProvisionJobState,
        attemptCount: data[0].attempt_count,
      };
    },

    async releaseJob(orderId: string) {
      await supabase.from('provision_job').update({ locked_at: null }).eq('order_id', orderId);
    },

    async transition(orderId: string, state: ProvisionJobState, note?: string) {
      await supabase.from('provision_job').update({ state }).eq('order_id', orderId);
      await appendHistory(orderId, note ? { state, note } : { state });
    },

    async recordFailure(orderId: string, errorMessage: string) {
      const { data } = await supabase
        .from('provision_job')
        .select('attempt_count')
        .eq('order_id', orderId)
        .single();
      await supabase
        .from('provision_job')
        .update({ attempt_count: (data?.attempt_count ?? 0) + 1, last_error: errorMessage })
        .eq('order_id', orderId);
      await appendHistory(orderId, { error: errorMessage });
    },

    async getOrder(orderId: string): Promise<ProvisionOrderRecord | null> {
      const { data, error } = await supabase
        .from('order')
        .select('id, status, guest_email, user_id, plan:plan_id(yesim_id)')
        .eq('id', orderId)
        .maybeSingle();
      if (error || !data) return null;
      const plan = Array.isArray(data.plan) ? data.plan[0] : data.plan;
      if (!plan?.yesim_id) return null;
      return {
        id: data.id,
        status: data.status ?? 'pending',
        email: data.guest_email,
        userId: data.user_id,
        planYesimId: plan.yesim_id,
      };
    },

    async findEsimByOrder(orderId: string): Promise<EsimRecordRef | null> {
      const { data } = await supabase
        .from('esim')
        .select('id, iccid')
        .eq('order_id', orderId)
        .maybeSingle();
      if (!data?.iccid) return null;
      return { id: data.id, iccid: data.iccid };
    },

    async insertEsim(orderId: string, userId: string | null, esim: YesimEsim): Promise<EsimRecordRef> {
      const { data, error } = await supabase
        .from('esim')
        .insert({
          order_id: orderId,
          user_id: userId,
          iccid: esim.iccid,
          yesim_user_id: esim.userId,
          qr_lpa: esim.qrcode,
          ios_tap_link: esim.iosTapLink,
          esim_passport_url: esim.esimPassport,
          status_qr: 'generated',
          yesim_status_raw: esim.statusQr,
        })
        .select('id, iccid')
        .single();
      if (error || !data) throw new Error(`insertEsim falló: ${error?.message ?? 'sin datos'}`);
      return { id: data.id, iccid: data.iccid };
    },

    async updateEsimFromSimInfo(esimId: string, info: YesimEsim) {
      await supabase
        .from('esim')
        .update({
          yesim_status_raw: info.statusQr,
          plan_activated_at: info.planActivatedAt,
          plan_expired_at: info.planExpiredAt,
          data_package_mb: info.dataPackageMb,
          data_left_mb: info.dataLeftMb,
          data_used_mb: info.dataUsedMb,
          usage_synced_at: new Date().toISOString(),
        })
        .eq('id', esimId);
    },

    async setOrderStatus(orderId: string, status: 'fulfilled' | 'failed_needs_review') {
      await supabase.from('order').update({ status }).eq('id', orderId);
    },

    async logAudit(action: string, payload: Record<string, unknown>) {
      await supabase.from('audit_log').insert({ action, actor_type: 'system_provision', payload });
    },
  };
}
