-- Configuración global real: tabla singleton platform_settings (cambio ADITIVO,
-- no toca las 24 tablas existentes) + gestión de cuentas admin vía RPCs.

-- ── Tabla singleton (una sola fila, id=1) ────────────────────────────────────
create table if not exists public.platform_settings (
  id int primary key default 1 check (id = 1),
  store_name text,
  support_email text,
  default_currency text default 'USD',
  default_margin_pct numeric default 100,
  wholesale_margin_pct numeric default 15,
  price_alert_threshold_pct numeric default 5,
  commission_l1_pct numeric default 15,
  commission_l2_pct numeric default 5,
  min_withdrawal_usd numeric default 50,
  updated_at timestamptz default now()
);

insert into public.platform_settings (id, store_name, support_email)
values (1, 'QuieroSIM', 'hola@quierosim.com')
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
drop policy if exists platform_settings_super on public.platform_settings;
-- Lectura/escritura solo super_admin. sync-catalog usa service_role → la bypassa.
create policy platform_settings_super on public.platform_settings
  for all using (is_super_admin()) with check (is_super_admin());

-- ── Gestión de cuentas admin (SECURITY DEFINER + guard super_admin + candados) ─
-- admin_profile NO se expone a escritura por RLS: estas RPCs son la única vía.

create or replace function public.admin_grant_admin(p_email text, p_sub_role text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if not is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_sub_role not in ('super_admin', 'support_agent') then
    return jsonb_build_object('ok', false, 'reason', 'Rol inválido.');
  end if;
  select id into v_user from user_profile where lower(email) = lower(trim(p_email));
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'No existe un usuario registrado con ese email. Tiene que registrarse primero.');
  end if;
  if exists (select 1 from admin_profile where user_id = v_user) then
    update admin_profile set sub_role = p_sub_role where user_id = v_user;
  else
    insert into admin_profile (user_id, sub_role) values (v_user, p_sub_role);
  end if;
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_set_admin_sub_role(p_user_id uuid, p_sub_role text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_sub_role not in ('super_admin', 'support_agent') then
    return jsonb_build_object('ok', false, 'reason', 'Rol inválido.');
  end if;
  -- No dejar el sistema sin super administradores.
  if p_sub_role = 'support_agent'
     and exists (select 1 from admin_profile where user_id = p_user_id and sub_role = 'super_admin')
     and (select count(*) from admin_profile where sub_role = 'super_admin') <= 1 then
    return jsonb_build_object('ok', false, 'reason', 'No podés dejar el sistema sin super administradores.');
  end if;
  update admin_profile set sub_role = p_sub_role where user_id = p_user_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'No es un administrador.'); end if;
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_revoke_admin(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then
    return jsonb_build_object('ok', false, 'reason', 'No podés revocarte a vos mismo.');
  end if;
  if exists (select 1 from admin_profile where user_id = p_user_id and sub_role = 'super_admin')
     and (select count(*) from admin_profile where sub_role = 'super_admin') <= 1 then
    return jsonb_build_object('ok', false, 'reason', 'No podés quitar el último super administrador.');
  end if;
  delete from admin_profile where user_id = p_user_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'No es un administrador.'); end if;
  return jsonb_build_object('ok', true);
end; $$;

revoke all on function public.admin_grant_admin(text, text) from public;
revoke all on function public.admin_set_admin_sub_role(uuid, text) from public;
revoke all on function public.admin_revoke_admin(uuid) from public;
grant execute on function public.admin_grant_admin(text, text) to authenticated;
grant execute on function public.admin_set_admin_sub_role(uuid, text) to authenticated;
grant execute on function public.admin_revoke_admin(uuid) to authenticated;
