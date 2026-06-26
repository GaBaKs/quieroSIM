-- Afiliados multinivel: al registrarse viniendo por el link de OTRO afiliado, el
-- nuevo afiliado queda como su referido (referred_by_affiliate_id). Eso habilita
-- la comisión L2 (5%) cuando el referido genera ventas.
-- register_affiliate suma p_referrer_ref (el referral_link del que invita, viene
-- de la cookie qs_aff). Solo cuenta si el referidor está 'approved' y no es uno mismo.

drop function if exists public.register_affiliate(text, integer);

create or replace function public.register_affiliate(p_channel text, p_audience integer, p_referrer_ref text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_referrer uuid := null;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'No autenticado.');
  end if;
  if exists (select 1 from affiliate_profile where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'Ya tenés una solicitud de afiliado.');
  end if;

  -- Cadena multinivel: el que invita debe ser un afiliado aprobado y distinto.
  if p_referrer_ref is not null and btrim(p_referrer_ref) <> '' then
    select id into v_referrer
      from affiliate_profile
      where referral_link = p_referrer_ref and status = 'approved' and user_id <> v_uid;
  end if;

  insert into affiliate_profile (user_id, channel, estimated_audience, status, terms_accepted, terms_accepted_at, referred_by_affiliate_id)
  values (v_uid, nullif(btrim(coalesce(p_channel, '')), ''), p_audience, 'pending', true, now(), v_referrer)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'affiliateId', v_id, 'referred', v_referrer is not null);
end;
$$;
revoke all on function public.register_affiliate(text, integer, text) from public;
grant execute on function public.register_affiliate(text, integer, text) to authenticated;
