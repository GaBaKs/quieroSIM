-- Vincular una compra guest hecha con OTRO email a la cuenta del usuario actual.
-- Complementa claim_my_orders (que matchea por el email de la cuenta): acá el
-- usuario prueba la compra con el "número de orden" del comprobante + el email.
-- El número de orden es el código corto que se muestra (primeros 8 chars del id,
-- ej. A118EC71) — el usuario no conoce el UUID completo. SECURITY DEFINER.

drop function if exists public.claim_order(uuid, text);

create or replace function public.claim_order(p_order_ref text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_confirmed timestamptz;
  v_ref text := upper(trim(p_order_ref));
  v_email text := lower(trim(p_email));
  v_match_count int;
  v_order_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'Necesitás iniciar sesión.');
  end if;
  select email_confirmed_at into v_confirmed from auth.users where id = v_uid;
  if v_confirmed is null then
    return jsonb_build_object('ok', false, 'reason', 'Confirmá tu email antes de vincular compras.');
  end if;

  -- Match por código corto (8 chars) o UUID completo, + email, sin vincular aún.
  select count(*), min(id) into v_match_count, v_order_id
  from "order"
  where user_id is null
    and lower(guest_email) = v_email
    and (upper(left(id::text, 8)) = v_ref or lower(id::text) = lower(trim(p_order_ref)));

  if v_match_count = 0 then
    return jsonb_build_object('ok', false, 'reason', 'No encontramos una compra con ese número de orden y email.');
  end if;
  if v_match_count > 1 then
    return jsonb_build_object('ok', false, 'reason', 'Encontramos varias compras; escribinos a soporte para vincularla.');
  end if;

  update "order" set user_id = v_uid where id = v_order_id and user_id is null;
  update esim set user_id = v_uid where order_id = v_order_id and user_id is null;

  -- Auditoría best-effort (no frenar el claim si actor_type/RLS no valida).
  begin
    insert into audit_log (action, actor_id, actor_type, payload)
    values ('order_claimed', v_uid, 'user', jsonb_build_object('order_id', v_order_id));
  exception when others then null;
  end;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.claim_order(text, text) from public;
revoke execute on function public.claim_order(text, text) from anon;
grant execute on function public.claim_order(text, text) to authenticated;
