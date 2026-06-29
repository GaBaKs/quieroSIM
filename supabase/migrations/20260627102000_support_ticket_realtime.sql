-- Soporte S3: el ticket entra a la publicación de Realtime para que el usuario
-- vea las respuestas del agente en vivo (filtrado por id) y el panel admin vea
-- los tickets nuevos. La RLS de support_ticket (dueño/admin) sigue aplicando.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'support_ticket'
  ) then
    alter publication supabase_realtime add table public.support_ticket;
  end if;
end $$;
