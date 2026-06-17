-- Limpieza post-advisors (Etapa 3):

-- 1. Trigger legacy de signup, duplicado y ROTO: creaba user_profile con id
--    aleatorio (gen_random_uuid) — el origen del bug de identidad corregido en
--    auth_identity_alignment. Con ambos triggers activos un signup nuevo falla.
--    Lo reemplaza tg_handle_new_auth_user (id = auth.users.id + rol customer).
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2. search_path fijo en las funciones legacy (advisor 0011).
alter function public.is_admin() set search_path = public;
alter function public.handle_updated_at() set search_path = public;
alter function public.calculate_plan_pricing() set search_path = public;
alter function public.log_price_history() set search_path = public;
alter function public.log_order_status_change() set search_path = public;
alter function public.prevent_audit_modification() set search_path = public;
alter function public.auto_log_critical_tables() set search_path = public;

-- 3. Las funciones de trigger no deben ser invocables vía RPC (advisors 0028/0029).
--    NOTA: is_admin()/is_super_admin() SIGUEN ejecutables a propósito — las
--    policies RLS las evalúan con el rol del consultante; revocarlas rompería
--    todas las queries.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.handle_updated_at() from public, anon, authenticated;
revoke execute on function public.calculate_plan_pricing() from public, anon, authenticated;
revoke execute on function public.log_price_history() from public, anon, authenticated;
revoke execute on function public.log_order_status_change() from public, anon, authenticated;
revoke execute on function public.prevent_audit_modification() from public, anon, authenticated;
revoke execute on function public.auto_log_critical_tables() from public, anon, authenticated;
