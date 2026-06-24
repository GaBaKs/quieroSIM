-- Realtime para el catálogo: la landing se suscribe a cambios en plan/pricing/
-- destination y se actualiza sola cuando el admin toca algo. Idempotente.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='plan') then
    alter publication supabase_realtime add table plan;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='plan_pricing') then
    alter publication supabase_realtime add table plan_pricing;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='destination') then
    alter publication supabase_realtime add table destination;
  end if;
end $$;
