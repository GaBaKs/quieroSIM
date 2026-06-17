-- Scheduler para los syncs de catálogo y dispositivos.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- El header x-cron-secret se valida en la function SOLO si el secret
-- CRON_SECRET está configurado en Edge Functions (hardening; ver ESTADO).
-- El Bearer es la anon key (pública) — verify_jwt exige un JWT válido.
select cron.schedule(
  'sync-catalog-daily',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://kusubcnxazjqozfjxbcf.supabase.co/functions/v1/sync-catalog',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1c3ViY254YXpqcW96Zmp4YmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzODQwMDcsImV4cCI6MjA5NTk2MDAwN30.kWfbXYzOtMkMQAViwjX-db65hq-LRn2l5ei0X7KF5lo", "x-cron-secret": "qsim_cron_v1_kx83mz_a9t27qfw51"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'sync-devices-weekly',
  '0 7 * * 1',
  $$
  select net.http_post(
    url := 'https://kusubcnxazjqozfjxbcf.supabase.co/functions/v1/sync-devices',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1c3ViY254YXpqcW96Zmp4YmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzODQwMDcsImV4cCI6MjA5NTk2MDAwN30.kWfbXYzOtMkMQAViwjX-db65hq-LRn2l5ei0X7KF5lo", "x-cron-secret": "qsim_cron_v1_kx83mz_a9t27qfw51"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
