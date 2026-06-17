-- Crons de la Etapa 6: reintento de entregas de QR y reconciliación de estado
-- de eSIMs. Mismo patrón que enable_cron: pg_net con anon JWT (la function
-- exige además x-cron-secret cuando CRON_SECRET está configurado en secrets).

select cron.schedule(
  'process-qr-deliveries',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://kusubcnxazjqozfjxbcf.supabase.co/functions/v1/deliveries/process',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1c3ViY254YXpqcW96Zmp4YmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzODQwMDcsImV4cCI6MjA5NTk2MDAwN30.kWfbXYzOtMkMQAViwjX-db65hq-LRn2l5ei0X7KF5lo", "x-cron-secret": "qsim_cron_v1_kx83mz_a9t27qfw51"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'sync-esim-status',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://kusubcnxazjqozfjxbcf.supabase.co/functions/v1/yesim-webhook/sync',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "qsim_cron_v1_kx83mz_a9t27qfw51"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
