-- Máquina de estados de provisión (Plan Backend §5): persiste el avance de la
-- emisión de eSIM por orden para garantizar UNA emisión por pago, con
-- reanudación exacta tras fallos y cola de revisión manual.

-- 1. Estados de orden que faltaban: fulfilled (pagada y entregada) y
--    failed_needs_review (pagada sin eSIM — retención explícita, revisión humana).
alter table public."order" drop constraint order_status_check;
alter table public."order" add constraint order_status_check
  check (status = any (array['pending'::text, 'paid'::text, 'fulfilled'::text, 'failed_needs_review'::text, 'failed'::text, 'refunded'::text]));

-- 2. Job de provisión: una fila por orden, con estado, reintentos e historial.
create table public.provision_job (
  id uuid primary key default extensions.uuid_generate_v4(),
  order_id uuid not null unique references public."order"(id),
  state text not null default 'queued'
    check (state = any (array['queued'::text, 'creating_esim'::text, 'activating_plan'::text, 'confirming'::text, 'fulfilled'::text, 'failed_needs_review'::text])),
  attempt_count integer not null default 0,
  last_error text,
  history jsonb not null default '[]'::jsonb, -- [{state, at, error?}] transiciones con timestamp
  locked_at timestamptz, -- lock optimista: dos ejecuciones concurrentes no emiten dos veces
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_provision_job_state on public.provision_job using btree (state);

create trigger tg_provision_job_updated_at before update on public.provision_job
  for each row execute function handle_updated_at();

-- Solo admin lee (panel de órdenes en revisión); las Edge Functions operan con service_role.
alter table public.provision_job enable row level security;
create policy provision_job_admin on public.provision_job for all using (is_admin());
