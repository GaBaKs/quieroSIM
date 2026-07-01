-- Mayorista M4: inventario de la agencia + asignación al cliente final.
alter table public.esim
  add column if not exists inventory_status text check (inventory_status in ('unassigned','assigned')) default 'unassigned',
  add column if not exists assigned_client_name text,
  add column if not exists assigned_client_email text,
  add column if not exists assigned_at timestamptz;

-- La agencia lee su propio inventario (nueva policy; las existentes quedan).
drop policy if exists esim_agency_sel on public.esim;
create policy esim_agency_sel on public.esim for select
  using (agency_profile_id in (select id from agency_profile where user_id = auth.uid() and status = 'approved'));

-- Asignar al cliente final (RPC: valida ownership, toca SOLO los campos de asignación).
create or replace function public.agency_assign_esim(p_esim_id uuid, p_client_name text, p_client_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_aid uuid;
begin
  select e.agency_profile_id into v_aid from esim e
    join agency_profile ap on ap.id = e.agency_profile_id
    where e.id = p_esim_id and ap.user_id = auth.uid() and ap.status = 'approved';
  if v_aid is null then return jsonb_build_object('ok', false, 'reason', 'eSIM no encontrada en tu inventario.'); end if;
  if coalesce(btrim(p_client_email), '') = '' then return jsonb_build_object('ok', false, 'reason', 'El email del cliente es obligatorio.'); end if;
  update esim set
    assigned_client_name = nullif(btrim(coalesce(p_client_name, '')), ''),
    assigned_client_email = btrim(p_client_email),
    assigned_at = now(),
    inventory_status = 'assigned'
  where id = p_esim_id;
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.agency_assign_esim(uuid, text, text) from public;
grant execute on function public.agency_assign_esim(uuid, text, text) to authenticated;

-- Realtime: la agencia ve el estado de su inventario en vivo (RLS lo aísla).
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'esim') then
    alter publication supabase_realtime add table public.esim;
  end if;
end $$;
