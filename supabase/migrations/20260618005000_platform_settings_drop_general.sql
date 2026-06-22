-- Settings generales (nombre tienda / email soporte / moneda) no se usan:
-- se quitan de platform_settings. Quedan márgenes/alertas (sí conectados a
-- sync-catalog) y afiliados (a futuro).
alter table public.platform_settings
  drop column if exists store_name,
  drop column if exists support_email,
  drop column if exists default_currency;
