-- Realtime para el dashboard del afiliado: el balance se actualiza en vivo cuando
-- llega una comisión, se convierte a crédito o se paga un retiro. postgres_changes
-- respeta RLS → cada afiliado solo recibe lo suyo.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'commission_movement') then
    alter publication supabase_realtime add table public.commission_movement;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'affiliate_credit') then
    alter publication supabase_realtime add table public.affiliate_credit;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'withdrawal_request') then
    alter publication supabase_realtime add table public.withdrawal_request;
  end if;
end $$;
