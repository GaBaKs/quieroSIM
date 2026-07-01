-- Emails de notificación configurables (vacío = aviso desactivado).
alter table public.platform_settings
  add column if not exists sales_notify_email text,
  add column if not exists claims_notify_email text;
