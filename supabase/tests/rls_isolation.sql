-- ============================================================================
-- Tests de aislamiento RLS — QuieroSIM (Etapa 3)
-- Ejecutar vía MCP execute_sql / psql. TODO dentro de una transacción con
-- ROLLBACK: no deja datos. Cada assert lanza EXCEPTION si falla.
-- Simula sesiones con: set local role + request.jwt.claims (sub = user id).
-- ============================================================================
begin;

-- ── Seed de prueba (como postgres, saltea RLS) ──────────────────────────────
insert into public.user_profile (id, email) values
  ('00000000-0000-4000-a000-000000000001', 'cliente.a@test.local'),
  ('00000000-0000-4000-a000-000000000002', 'cliente.b@test.local'),
  ('00000000-0000-4000-a000-000000000003', 'soporte@test.local'),
  ('00000000-0000-4000-a000-000000000004', 'super@test.local');

insert into public.admin_profile (user_id, sub_role) values
  ('00000000-0000-4000-a000-000000000003', 'support_agent'),
  ('00000000-0000-4000-a000-000000000004', 'super_admin');

insert into public.plan (id, yesim_id, name) values
  ('00000000-0000-4000-b000-000000000001', 'testplan0000000000000000000000aa', 'Plan Test');
insert into public.plan_pricing (plan_id, cost_provider_eur, margin_pct, price_final, price_wholesale)
  values ('00000000-0000-4000-b000-000000000001', 5.00, 100, 10.00, 7.00);

insert into public."order" (id, user_id, plan_id, price_paid) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000001', 10),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-b000-000000000001', 10);

insert into public.esim (id, order_id, user_id, iccid) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000001', '8900000000000000001'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000002', '8900000000000000002');

insert into public.coupon (code, discount_type, discount_value) values ('SECRETO10', 'percentage', 10);

insert into public.affiliate_profile (id, user_id) values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-a000-000000000001');
insert into public.commission_movement (affiliate_profile_id, order_id, amount) values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-c000-000000000002', 1.50);
insert into public.price_history (plan_id, new_value) values
  ('00000000-0000-4000-b000-000000000001', 10.00);

-- ── Cliente A: ve solo lo suyo ───────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';

do $$
begin
  if (select count(*) from public."order") <> 1 then
    raise exception 'FALLO: cliente A debería ver exactamente 1 orden (la suya), ve %', (select count(*) from public."order");
  end if;
  if exists (select 1 from public."order" where user_id = '00000000-0000-4000-a000-000000000002') then
    raise exception 'FALLO: cliente A puede ver órdenes del cliente B';
  end if;
  if (select count(*) from public.esim) <> 1 then
    raise exception 'FALLO: cliente A debería ver exactamente 1 eSIM, ve %', (select count(*) from public.esim);
  end if;
  if (select count(*) from public.coupon) <> 0 then
    raise exception 'FALLO: un cliente puede listar cupones';
  end if;
  if (select count(*) from public.commission_movement) <> 1 then
    raise exception 'FALLO: el afiliado A debería ver su propia comisión';
  end if;
  if public.is_admin() then
    raise exception 'FALLO: cliente A figura como admin';
  end if;
end $$;

-- ── Anon: catálogo sí, pricing interno y cupones no ──────────────────────────
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
declare v_ok boolean := false;
begin
  -- (asserts por fila puntual: la BD ya tiene catálogo real además del seed)
  if not exists (select 1 from public.plan where id = '00000000-0000-4000-b000-000000000001') then
    raise exception 'FALLO: anon debería ver el catálogo de planes';
  end if;
  if not exists (select 1 from public.catalog_pricing where plan_id = '00000000-0000-4000-b000-000000000001') then
    raise exception 'FALLO: anon debería ver catalog_pricing (precio final público)';
  end if;
  begin
    perform 1 from public.plan_pricing;
  exception when insufficient_privilege then
    v_ok := true;
  end;
  if not v_ok then
    raise exception 'FALLO: anon puede leer plan_pricing (costo/margen/mayorista expuestos)';
  end if;
  if (select count(*) from public.coupon) <> 0 then
    raise exception 'FALLO: anon puede listar cupones';
  end if;
end $$;

-- ── Support agent: opera pero NO ve finanzas ─────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

do $$
begin
  if not public.is_admin() then
    raise exception 'FALLO: support_agent debería ser admin';
  end if;
  if public.is_super_admin() then
    raise exception 'FALLO: support_agent figura como super_admin';
  end if;
  if (select count(*) from public."order" where id in ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-c000-000000000002')) <> 2 then
    raise exception 'FALLO: support_agent debería ver todas las órdenes (operación)';
  end if;
  if (select count(*) from public.commission_movement) <> 0 then
    raise exception 'FALLO: support_agent puede ver comisiones (finanzas)';
  end if;
  if (select count(*) from public.price_history) <> 0 then
    raise exception 'FALLO: support_agent puede ver historial de precios (finanzas)';
  end if;
  if (select count(*) from public.audit_log) <> 0 then
    raise exception 'FALLO: support_agent puede ver el audit_log';
  end if;
  -- Etapa 7: support_agent VE el catálogo y los precios, pero NO puede editarlos.
  if (select count(*) from public.plan_pricing where plan_id = '00000000-0000-4000-b000-000000000001') <> 1 then
    raise exception 'FALLO: support_agent debería poder LEER plan_pricing (costo/margen)';
  end if;
end $$;

-- support_agent NO puede EDITAR precios (escritura es solo super_admin, Etapa 7).
do $$
declare v_blocked boolean := false;
begin
  begin
    update public.plan_pricing set margin_pct = 999 where plan_id = '00000000-0000-4000-b000-000000000001';
    if not found then v_blocked := true; end if; -- RLS filtró la fila → 0 updates
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'FALLO: support_agent pudo EDITAR plan_pricing (debe ser solo super_admin)';
  end if;
end $$;

-- ── Super admin: ve todo ─────────────────────────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

do $$
begin
  if not public.is_super_admin() then
    raise exception 'FALLO: super@test debería ser super_admin';
  end if;
  if (select count(*) from public.commission_movement where order_id = '00000000-0000-4000-c000-000000000002') <> 1 then
    raise exception 'FALLO: super_admin debería ver las comisiones';
  end if;
  if not exists (select 1 from public.price_history where plan_id = '00000000-0000-4000-b000-000000000001') then
    raise exception 'FALLO: super_admin debería ver el historial de precios';
  end if;
  if not exists (select 1 from public.coupon where code = 'SECRETO10') then
    raise exception 'FALLO: super_admin debería ver los cupones';
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Etapa 6: claim de compras guest + visibilidad de qr_delivery
-- ════════════════════════════════════════════════════════════════════════════
reset role;

-- Usuarios reales en auth.users (el trigger crea sus user_profile):
-- u5 confirmado, u6 confirmado con OTRO email, u7 SIN confirmar.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current, phone_change,
  phone_change_token, reauthentication_token
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000005', 'authenticated', 'authenticated', 'claimer.a@test.local', 'x', now(), now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000006', 'authenticated', 'authenticated', 'otro.b@test.local', 'x', now(), now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000007', 'authenticated', 'authenticated', 'sin.confirmar@test.local', 'x', null, now(), now(), '', '', '', '', '', '', '', '');

-- Compras GUEST (user_id null) hechas con esos emails:
insert into public."order" (id, user_id, guest_email, plan_id, price_paid) values
  ('00000000-0000-4000-c000-000000000003', null, 'CLAIMER.A@test.local', '00000000-0000-4000-b000-000000000001', 10),
  ('00000000-0000-4000-c000-000000000004', null, 'sin.confirmar@test.local', '00000000-0000-4000-b000-000000000001', 10);
insert into public.esim (id, order_id, user_id, iccid, qr_lpa) values
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-c000-000000000003', null, '8900000000000000003', 'LPA:1$test$CLAIM01');
insert into public.qr_delivery (esim_id, channel, status) values
  ('00000000-0000-4000-d000-000000000003', 'email', 'sent');

-- u6 (email distinto) intenta primero: NO roba la orden de A.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000006","role":"authenticated"}';
do $$
begin
  if public.claim_my_orders() <> 0 then
    raise exception 'FALLO: u6 reclamó órdenes de un email ajeno';
  end if;
  if exists (select 1 from public."order" where id = '00000000-0000-4000-c000-000000000003') then
    raise exception 'FALLO: u6 puede ver la orden guest de A';
  end if;
end $$;

-- u7 (email correcto pero SIN confirmar): el candado anti-robo exige verificación.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000007","role":"authenticated"}';
do $$
begin
  if public.claim_my_orders() <> 0 then
    raise exception 'FALLO: un usuario sin email confirmado pudo reclamar órdenes';
  end if;
end $$;

-- u5 (dueño del email, confirmado): reclama y ve su eSIM + su entrega.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000005","role":"authenticated"}';
do $$
begin
  if public.claim_my_orders() <> 1 then
    raise exception 'FALLO: u5 debería reclamar exactamente 1 orden (case-insensitive)';
  end if;
  if not exists (select 1 from public."order" where id = '00000000-0000-4000-c000-000000000003' and user_id = '00000000-0000-4000-a000-000000000005') then
    raise exception 'FALLO: la orden guest no quedó vinculada a u5';
  end if;
  if not exists (select 1 from public.esim where id = '00000000-0000-4000-d000-000000000003' and user_id = '00000000-0000-4000-a000-000000000005') then
    raise exception 'FALLO: la eSIM guest no quedó vinculada a u5';
  end if;
  if (select count(*) from public.qr_delivery) <> 1 then
    raise exception 'FALLO: u5 debería ver SU entrega de QR';
  end if;
end $$;

-- u6 sigue sin ver nada de u5 (incluida la entrega).
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000006","role":"authenticated"}';
do $$
begin
  if (select count(*) from public.esim) <> 0 then
    raise exception 'FALLO: u6 ve eSIMs ajenas';
  end if;
  if (select count(*) from public.qr_delivery) <> 0 then
    raise exception 'FALLO: u6 ve entregas de QR ajenas';
  end if;
end $$;

reset role;
select 'RLS OK: todos los asserts pasaron' as resultado;
rollback;
