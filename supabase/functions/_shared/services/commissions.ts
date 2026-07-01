// Motor de comisiones de afiliados (append-only). Tras una venta atribuida que
// queda fulfilled, acredita la comisión L1 (afiliado directo) y L2 (su referidor)
// como asientos inmutables en commission_movement. Idempotente por (order_id,level)
// → los reintentos del webhook nunca duplican. El balance se DERIVA de estos
// asientos (nunca se edita a mano). Órdenes gratis (price_paid=0) no generan comisión.

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// deno-lint-ignore no-explicit-any
export async function accrueCommissions(supabase: any, orderId: string): Promise<void> {
  try {
    const { data: order } = await supabase
      .from('order')
      .select('affiliate_profile_id, price_paid')
      .eq('id', orderId)
      .maybeSingle();
    if (!order?.affiliate_profile_id) return; // venta sin afiliado
    const revenue = Number(order.price_paid ?? 0);
    if (!(revenue > 0)) return; // gratis / cubierta por crédito → sin comisión

    const { data: s } = await supabase
      .from('platform_settings')
      .select('commission_l1_pct, commission_l2_pct')
      .eq('id', 1)
      .maybeSingle();
    const l1Pct = Number(s?.commission_l1_pct ?? 0);
    const l2Pct = Number(s?.commission_l2_pct ?? 0);

    const l1Affiliate = order.affiliate_profile_id as string;
    const movements: Array<{ affiliate_profile_id: string; order_id: string; amount: number; level: number; status: string; currency: string }> = [];

    if (l1Pct > 0) {
      movements.push({ affiliate_profile_id: l1Affiliate, order_id: orderId, amount: round2((revenue * l1Pct) / 100), level: 1, status: 'available', currency: 'USD' });
    }

    if (l2Pct > 0) {
      const { data: l1prof } = await supabase
        .from('affiliate_profile')
        .select('referred_by_affiliate_id')
        .eq('id', l1Affiliate)
        .maybeSingle();
      const l2Affiliate = (l1prof?.referred_by_affiliate_id as string | null) ?? null;
      if (l2Affiliate) {
        movements.push({ affiliate_profile_id: l2Affiliate, order_id: orderId, amount: round2((revenue * l2Pct) / 100), level: 2, status: 'available', currency: 'USD' });
      }
    }

    for (const m of movements) {
      // Idempotente por (order_id, level): si ya existe, no inserta de nuevo.
      const { error } = await supabase
        .from('commission_movement')
        .upsert(m, { onConflict: 'order_id,level', ignoreDuplicates: true });
      if (error) console.error('commission insert error', error.message);
    }
  } catch (e) {
    console.error('accrueCommissions error', e instanceof Error ? e.message : String(e));
  }
}
