-- Fase 12 (Etapa G): rotar el x-cron-secret a Supabase Vault. Saca el literal del
-- repo y de la definición de los cron jobs (antes estaba hardcodeado en las
-- migraciones de crons). El valor se genera random; en un proyecto NUEVO, tras
-- aplicar, hay que setear el secret CRON_SECRET de las Edge Functions al MISMO
-- valor que quedó en Vault:
--   select decrypted_secret from vault.decrypted_secrets where name='cron_secret';
--   supabase secrets set CRON_SECRET=<ese valor> --project-ref <ref>

-- 1) Secret en Vault (idempotente).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'cron_secret', 'x-cron-secret de los crons (Fase 12)');
  end if;
end $$;

-- 2) Reprogramar los jobs (por nombre) para leer el x-cron-secret de Vault.
--    El anon JWT queda literal a propósito (es público).
select cron.alter_job((select jobid from cron.job where jobname='sync-catalog-daily'), command := $cmd$
  select net.http_post(
    url := 'https://kusubcnxazjqozfjxbcf.supabase.co/functions/v1/sync-catalog',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1c3ViY254YXpqcW96Zmp4YmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzODQwMDcsImV4cCI6MjA5NTk2MDAwN30.kWfbXYzOtMkMQAViwjX-db65hq-LRn2l5ei0X7KF5lo','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    body := '{}'::jsonb);
$cmd$);
select cron.alter_job((select jobid from cron.job where jobname='sync-devices-weekly'), command := $cmd$
  select net.http_post(
    url := 'https://kusubcnxazjqozfjxbcf.supabase.co/functions/v1/sync-devices',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1c3ViY254YXpqcW96Zmp4YmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzODQwMDcsImV4cCI6MjA5NTk2MDAwN30.kWfbXYzOtMkMQAViwjX-db65hq-LRn2l5ei0X7KF5lo','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    body := '{}'::jsonb);
$cmd$);
select cron.alter_job((select jobid from cron.job where jobname='process-qr-deliveries'), command := $cmd$
  select net.http_post(
    url := 'https://kusubcnxazjqozfjxbcf.supabase.co/functions/v1/deliveries/process',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1c3ViY254YXpqcW96Zmp4YmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzODQwMDcsImV4cCI6MjA5NTk2MDAwN30.kWfbXYzOtMkMQAViwjX-db65hq-LRn2l5ei0X7KF5lo','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    body := '{}'::jsonb);
$cmd$);
select cron.alter_job((select jobid from cron.job where jobname='sync-esim-status'), command := $cmd$
  select net.http_post(
    url := 'https://kusubcnxazjqozfjxbcf.supabase.co/functions/v1/yesim-webhook/sync',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    body := '{}'::jsonb);
$cmd$);
select cron.alter_job((select jobid from cron.job where jobname='process-whatsapp-deliveries'), command := $cmd$
  select net.http_post(
    url := 'https://kusubcnxazjqozfjxbcf.supabase.co/functions/v1/whatsapp-send/process',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1c3ViY254YXpqcW96Zmp4YmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzODQwMDcsImV4cCI6MjA5NTk2MDAwN30.kWfbXYzOtMkMQAViwjX-db65hq-LRn2l5ei0X7KF5lo','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    body := '{}'::jsonb);
$cmd$);
