-- Mayorista M1: alta/aprobación de agencias (espejo de afiliados) + margen propio + helper de rol.

alter table public.agency_profile add column if not exists custom_margin_pct numeric;

-- Helper: ¿el usuario actual es una agencia aprobada? (espejo de is_admin()).
create or replace function public.is_agency()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from agency_profile where user_id = auth.uid() and status = 'approved');
$$;
revoke all on function public.is_agency() from public;
grant execute on function public.is_agency() to anon, authenticated;

-- Alta: el usuario logueado solicita ser agencia (queda 'pending').
create or replace function public.register_agency(p_company_name text, p_tax_id text default null, p_billing_address text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'No autenticado.'); end if;
  if exists (select 1 from agency_profile where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'Ya tenés una solicitud de agencia.'); end if;
  if coalesce(btrim(p_company_name), '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'El nombre de la empresa es obligatorio.'); end if;
  insert into agency_profile (user_id, company_name, tax_id, billing_address, status)
  values (v_uid, btrim(p_company_name), nullif(btrim(coalesce(p_tax_id, '')), ''), nullif(btrim(coalesce(p_billing_address, '')), ''), 'pending')
  returning id into v_id;
  return jsonb_build_object('ok', true, 'agencyId', v_id);
end; $$;
revoke all on function public.register_agency(text, text, text) from public;
grant execute on function public.register_agency(text, text, text) to authenticated;

-- Aprobar/suspender (solo admin). Al aprobar: approved_at + asigna el rol 'agency'.
create or replace function public.admin_set_agency_status(p_agency_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if not is_admin() then return jsonb_build_object('ok', false, 'reason', 'Solo administradores.'); end if;
  if p_status not in ('pending', 'approved', 'suspended') then
    return jsonb_build_object('ok', false, 'reason', 'Estado inválido.'); end if;
  select user_id into v_user from agency_profile where id = p_agency_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'Agencia no encontrada.'); end if;
  if p_status = 'approved' then
    update agency_profile set status = 'approved', approved_at = coalesce(approved_at, now()) where id = p_agency_id;
    if not exists (select 1 from user_role ur join role r on r.id = ur.role_id where ur.user_id = v_user and r.name = 'agency') then
      insert into user_role (user_id, role_id) values (v_user, (select id from role where name = 'agency'));
    end if;
  else
    update agency_profile set status = p_status where id = p_agency_id;
  end if;
  insert into audit_log (action, actor_id, actor_type, payload)
  values ('agency_status_' || p_status, auth.uid(), 'admin', jsonb_build_object('agency_id', p_agency_id));
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.admin_set_agency_status(uuid, text) from public;
grant execute on function public.admin_set_agency_status(uuid, text) to authenticated;

-- Crear agencia APROBADA directa para un usuario (idempotente).
create or replace function public.admin_create_agency(p_user_id uuid, p_company_name text, p_tax_id text default null, p_billing_address text default null, p_margin numeric default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_admin() then return jsonb_build_object('ok', false, 'reason', 'Solo administradores.'); end if;
  if not exists (select 1 from user_profile where id = p_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'Usuario no encontrado.'); end if;
  select id into v_id from agency_profile where user_id = p_user_id;
  if v_id is null then
    insert into agency_profile (user_id, company_name, tax_id, billing_address, status, approved_at, custom_margin_pct)
    values (p_user_id, coalesce(nullif(btrim(p_company_name), ''), 'Agencia'), nullif(btrim(coalesce(p_tax_id, '')), ''),
            nullif(btrim(coalesce(p_billing_address, '')), ''), 'approved', now(), p_margin)
    returning id into v_id;
  else
    update agency_profile set status = 'approved', approved_at = coalesce(approved_at, now()),
      company_name = coalesce(nullif(btrim(p_company_name), ''), company_name),
      custom_margin_pct = coalesce(p_margin, custom_margin_pct)
    where id = v_id;
  end if;
  if not exists (select 1 from user_role ur join role r on r.id = ur.role_id where ur.user_id = p_user_id and r.name = 'agency') then
    insert into user_role (user_id, role_id) values (p_user_id, (select id from role where name = 'agency'));
  end if;
  insert into audit_log (action, actor_id, actor_type, payload)
  values ('agency_created_by_admin', auth.uid(), 'admin', jsonb_build_object('agency_id', v_id, 'user_id', p_user_id));
  return jsonb_build_object('ok', true, 'agencyId', v_id);
end; $$;
revoke all on function public.admin_create_agency(uuid, text, text, text, numeric) from public;
grant execute on function public.admin_create_agency(uuid, text, text, text, numeric) to authenticated;

-- Editar el margen propio de la agencia (null = usa el global).
create or replace function public.admin_set_agency_margin(p_agency_id uuid, p_margin numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then return jsonb_build_object('ok', false, 'reason', 'Solo administradores.'); end if;
  if p_margin is not null and (p_margin < 0 or p_margin > 1000) then
    return jsonb_build_object('ok', false, 'reason', 'Margen inválido (0 a 1000).'); end if;
  update agency_profile set custom_margin_pct = p_margin where id = p_agency_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'Agencia no encontrada.'); end if;
  insert into audit_log (action, actor_id, actor_type, payload)
  values ('agency_margin_update', auth.uid(), 'admin', jsonb_build_object('agency_id', p_agency_id, 'margin', p_margin));
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.admin_set_agency_margin(uuid, numeric) from public;
grant execute on function public.admin_set_agency_margin(uuid, numeric) to authenticated;
