-- Consumo de datos y estado crudo de YeSim (Plan Backend §7): necesarios para
-- el panel "Mis eSIMs", los webhooks PackageUsage y el polling de reconciliación.
alter table public.esim
  add column data_package_mb numeric,
  add column data_used_mb numeric,
  add column data_left_mb numeric,
  add column usage_synced_at timestamptz,
  -- Estado tal como lo reporta YeSim (Released/Installed/Enabled/Disabled/Deleted);
  -- status_qr queda como estado derivado para la UI.
  add column yesim_status_raw text,
  -- Referencia al PNG del QR en Supabase Storage privado (dato sensible).
  add column qr_img_path text;
