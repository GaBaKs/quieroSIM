-- Canal WhatsApp (Twilio): hospedaje transitorio del QR + cron de reintentos.
-- 100% backend; reutiliza qr_delivery (channel='whatsapp' ya permitido por el
-- CHECK existente) y order.guest_phone (ya existente). No agrega columnas.

-- Bucket PRIVADO para el PNG del QR que Twilio levanta por URL firmada (TTL corto).
-- Privado: nunca accesible sin firma. El service_role (Edge Functions) lo
-- escribe/firma; no hacen falta policies para anon.
insert into storage.buckets (id, name, public)
values ('qr-media', 'qr-media', false)
on conflict (id) do nothing;

-- Cron: barre entregas whatsapp pending/failed y purga media vencida.
-- Mismo patrón que process-qr-deliveries (pg_net con anon JWT; la function exige
-- además x-cron-secret cuando CRON_SECRET está configurado en secrets).
select cron.schedule(
  'process-whatsapp-deliveries',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://kusubcnxazjqozfjxbcf.supabase.co/functions/v1/whatsapp-send/process',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1c3ViY254YXpqcW96Zmp4YmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzODQwMDcsImV4cCI6MjA5NTk2MDAwN30.kWfbXYzOtMkMQAViwjX-db65hq-LRn2l5ei0X7KF5lo", "x-cron-secret": "qsim_cron_v1_kx83mz_a9t27qfw51"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
