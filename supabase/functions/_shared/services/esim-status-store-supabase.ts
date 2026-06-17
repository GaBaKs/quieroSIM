import type { SupabaseClient } from '@supabase/supabase-js';
import type { EsimStatusStore, EsimStatusUpdate } from './esim-status.ts';

/**
 * EsimStatusStore sobre Supabase (service_role — corre SOLO en Edge Functions).
 */

// deno-lint-ignore no-explicit-any
type AnyClient = SupabaseClient<any, 'public', any>;

export function createSupabaseEsimStatusStore(supabase: AnyClient): EsimStatusStore {
  return {
    async findEsimByIccid(iccid: string) {
      const { data } = await supabase
        .from('esim')
        .select('id, iccid')
        .eq('iccid', iccid)
        .maybeSingle();
      return data ?? null;
    },

    async recordWebhookEvent(eventType: string, iccid: string | null, payload: unknown): Promise<string> {
      const { data, error } = await supabase
        .from('yesim_webhook_event')
        .insert({ event_type: eventType, iccid, payload, processing_result: 'received' })
        .select('id')
        .single();
      if (error || !data) throw new Error(`recordWebhookEvent falló: ${error?.message ?? 'sin datos'}`);
      return data.id;
    },

    async setWebhookResult(eventId: string, result: string): Promise<void> {
      await supabase.from('yesim_webhook_event').update({ processing_result: result }).eq('id', eventId);
    },

    async applyStatusUpdate(esimId: string, update: EsimStatusUpdate): Promise<void> {
      const patch: Record<string, unknown> = {
        status_qr: update.statusQr,
        yesim_status_raw: update.yesimStatusRaw,
        usage_synced_at: new Date().toISOString(),
      };
      if (update.planActivatedAt !== undefined) patch.plan_activated_at = update.planActivatedAt;
      if (update.planExpiredAt !== undefined) patch.plan_expired_at = update.planExpiredAt;
      if (update.dataPackageMb !== undefined) patch.data_package_mb = update.dataPackageMb;
      if (update.dataLeftMb !== undefined) patch.data_left_mb = update.dataLeftMb;
      if (update.dataUsedMb !== undefined) patch.data_used_mb = update.dataUsedMb;
      await supabase.from('esim').update(patch).eq('id', esimId);
    },

    async listActiveIccids(limit: number): Promise<string[]> {
      const { data } = await supabase
        .from('esim')
        .select('iccid')
        .not('iccid', 'is', null)
        .neq('status_qr', 'expired')
        .or(`plan_expired_at.is.null,plan_expired_at.gt.${new Date().toISOString()}`)
        .order('usage_synced_at', { ascending: true, nullsFirst: true })
        .limit(limit);
      return (data ?? []).map((row: { iccid: string }) => row.iccid);
    },
  };
}
