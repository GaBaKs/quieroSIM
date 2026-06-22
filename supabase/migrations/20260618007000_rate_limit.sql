-- Fase 12 (Etapa D): rate limiting por ventana fija, respaldado en Postgres.
-- Lo llaman SOLO las Edge Functions (service_role); no se expone a anon/authenticated
-- (así no reabre el advisor 0028/0029 que limpiamos en la Etapa B).

create table if not exists public.rate_limit (
  bucket text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);
alter table public.rate_limit enable row level security;
-- Sin policies: solo la RPC SECURITY DEFINER la toca; nadie la lee/escribe por RLS.

create or replace function public.rate_limit_hit(p_bucket text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  -- Bucket inválido → fail-open (no romper el flujo por un header faltante).
  if length(coalesce(p_bucket, '')) = 0 or length(p_bucket) > 200 then
    return true;
  end if;
  insert into rate_limit (bucket, count, window_start)
  values (p_bucket, 1, now())
  on conflict (bucket) do update
    set count = case
          when rate_limit.window_start < now() - make_interval(secs => greatest(p_window_seconds, 1))
          then 1 else rate_limit.count + 1 end,
        window_start = case
          when rate_limit.window_start < now() - make_interval(secs => greatest(p_window_seconds, 1))
          then now() else rate_limit.window_start end
  returning count into v_count;
  -- true = permitido (dentro del límite); false = excedido.
  return v_count <= greatest(p_max, 1);
end;
$$;

revoke all on function public.rate_limit_hit(text, int, int) from public;
revoke execute on function public.rate_limit_hit(text, int, int) from anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
