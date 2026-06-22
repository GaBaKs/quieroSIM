-- Fase 12 (Etapa B): endurecer grants de RPCs SECURITY DEFINER (advisor 0028/0029).
-- Las default privileges de Supabase otorgan EXECUTE a anon/authenticated en toda
-- función nueva; acá revocamos anon donde no corresponde (defensa en profundidad
-- sobre los guards is_admin/is_super_admin que ya existen).
--
-- NO se tocan is_admin()/is_super_admin(): las usan las RLS policies y deben
-- seguir ejecutables por anon/authenticated o las policies fallarían.

-- Admin RPCs: las llaman los Server Actions como 'authenticated' (+ guard interno).
-- anon no las necesita → revocar.
revoke execute on function public.admin_dashboard_metrics() from anon;
revoke execute on function public.admin_top_plans(int) from anon;
revoke execute on function public.admin_sales_series(int) from anon;
revoke execute on function public.admin_sales_report(int) from anon;
revoke execute on function public.admin_finance_report(int) from anon;
revoke execute on function public.admin_refunds_report(int) from anon;
revoke execute on function public.admin_grant_admin(text, text) from anon;
revoke execute on function public.admin_set_admin_sub_role(uuid, text) from anon;
revoke execute on function public.admin_revoke_admin(uuid) from anon;
revoke execute on function public.log_admin_action(text, jsonb) from anon;

-- claim_my_orders: solo usuarios logueados (exige email confirmado).
revoke execute on function public.claim_my_orders() from anon;

-- redeem_coupon: SOLO el webhook de Stripe (service_role). No tiene guard de admin
-- y redime un cupón contra una orden → ni anon ni authenticated deben ejecutarla.
revoke execute on function public.redeem_coupon(uuid, uuid) from anon, authenticated;

-- validate_coupon queda con anon: el preview de cupón en checkout guest lo necesita
-- (solo devuelve el descuento, sin escribir).

-- Mover la extensión vector fuera de public (advisor 0014). No está en uso aún
-- (KB/embeddings es feature futura); el schema 'extensions' está en el search_path.
alter extension vector set schema extensions;
