-- ============================================================================
-- BASELINE — Esquema QuieroSIM al 2026-06-12
-- Foto del esquema creado originalmente a mano en el proyecto dev
-- (kusubcnxazjqozfjxbcf). Este archivo NO se ejecuta sobre dev (ya existe);
-- sirve para recrear la base idéntica en un entorno nuevo (producción) y como
-- punto de partida del versionado. En dev está registrado como aplicado.
-- ============================================================================

-- ── Extensiones ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema public;

-- ── Funciones ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profile WHERE user_id = auth.uid()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    RAISE EXCEPTION 'Operación denegada: La tabla audit_log es inmutable y append-only.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_log_critical_tables()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_action TEXT;
    v_payload JSONB;
    v_actor_id UUID;
    v_actor_type TEXT;
BEGIN
    v_action := TG_OP;

    -- Extraemos el UUID del usuario autenticado en la sesión actual
    v_actor_id := auth.uid();

    IF v_actor_id IS NOT NULL THEN
        v_actor_type := 'authenticated_user';
    ELSE
        -- Si es NULL, puede ser el Service Role (webhook) o usuario anónimo
        v_actor_type := 'system_role';
    END IF;

    -- Armamos el payload separando ordenadamente old_data y new_data
    v_payload := jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'record_id', COALESCE(NEW.id, OLD.id),
        'old_data', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        'new_data', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );

    INSERT INTO public.audit_log (action, actor_id, actor_type, payload, occurred_at)
    VALUES (v_action, v_actor_id, v_actor_type, v_payload, now());

    -- Resolución del bug: Manejo condicional del retorno
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.audit_log (id, action, actor_id, actor_type, payload, occurred_at)
        VALUES (
            gen_random_uuid(),
            'order_status_change',
            NEW.user_id, -- Relacionamos al usuario de la orden
            'system_or_user',
            jsonb_build_object(
                'order_id', NEW.id,
                'old_status', OLD.status,
                'new_status', NEW.status
            ),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_plan_pricing()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Si el precio fijo está activado y configurado, se respeta.
    IF NEW.use_fixed_price = TRUE AND NEW.price_fixed IS NOT NULL THEN
        NEW.price_final = NEW.price_fixed;
    ELSE
        -- Precio final = costo * (1 + margen/100). Asume margen en número (ej. 20 para 20%)
        NEW.price_final = NEW.cost_provider_eur * (1 + (COALESCE(NEW.margin_pct, 0) / 100.0));
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_price_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Solo loguear si el precio final es distinto
    IF OLD.price_final IS DISTINCT FROM NEW.price_final THEN
        INSERT INTO public.price_history (id, plan_id, old_value, new_value, origin, changed_at)
        VALUES (
            gen_random_uuid(),
            NEW.plan_id,
            OLD.price_final,
            NEW.price_final,
            'system_trigger',
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$function$;

-- ── Tablas (en orden de dependencias FK) ────────────────────────────────────

-- Usuarios y roles
create table public.user_profile (
  id uuid primary key default extensions.uuid_generate_v4(),
  auth_user_id uuid references auth.users(id),
  email text not null unique,
  phone_whatsapp text,
  full_name text,
  lang_pref text default 'ES',
  account_status text default 'active' check (account_status = any (array['active'::text, 'suspended'::text, 'deleted'::text])),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.role (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null unique,
  description text
);

create table public.user_role (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references public.user_profile(id),
  role_id uuid not null references public.role(id),
  assigned_at timestamptz default now(),
  assigned_by uuid references public.user_profile(id)
);

create table public.admin_profile (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null unique references public.user_profile(id),
  sub_role text not null check (sub_role = any (array['super_admin'::text, 'support_agent'::text]))
);

create table public.affiliate_profile (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null unique references public.user_profile(id),
  channel text,
  estimated_audience integer,
  referral_link text unique,
  coupon_code text unique,
  terms_accepted boolean default true,
  terms_accepted_at timestamptz,
  status text default 'pending' check (status = any (array['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text])),
  referred_by_affiliate_id uuid references public.affiliate_profile(id),
  created_at timestamptz default now()
);

create table public.agency_profile (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null unique references public.user_profile(id),
  company_name text not null,
  tax_id text,
  billing_address text,
  status text default 'pending' check (status = any (array['pending'::text, 'approved'::text, 'suspended'::text])),
  approved_at timestamptz
);

create table public.gdpr_consent (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid references public.user_profile(id),
  categories_accepted jsonb not null,
  action text not null,
  consented_at timestamptz default now(),
  ip_address inet
);

-- Catálogo y precios
create table public.plan (
  id uuid primary key default extensions.uuid_generate_v4(),
  yesim_id text not null unique,
  yesim_old_id integer,
  name text not null,
  country_region text,
  iso_country text,
  plan_type text,
  duration_days integer,
  data_amount text,
  operators text,
  currency text default 'USD',
  retail_price_ref numeric,
  is_fup boolean default false,
  fup_threshold_gb numeric,
  status text default 'active' check (status = any (array['active'::text, 'inactive'::text])),
  last_sync_at timestamptz default now()
);

create table public.plan_pricing (
  id uuid primary key default extensions.uuid_generate_v4(),
  plan_id uuid not null unique references public.plan(id),
  cost_provider_eur numeric not null,
  margin_pct numeric not null,
  price_final numeric not null,
  price_fixed numeric,
  use_fixed_price boolean default false,
  price_wholesale numeric,
  updated_at timestamptz default now()
);

create table public.price_history (
  id uuid primary key default extensions.uuid_generate_v4(),
  plan_id uuid not null references public.plan(id),
  old_value numeric,
  new_value numeric not null,
  origin text,
  changed_at timestamptz default now()
);

create table public.device_compat (
  id uuid primary key default extensions.uuid_generate_v4(),
  category text,
  brand text,
  model text,
  synced_at timestamptz default now()
);

-- Cupones
create table public.coupon (
  id uuid primary key default extensions.uuid_generate_v4(),
  code text not null unique,
  discount_type text not null check (discount_type = any (array['percentage'::text, 'fixed'::text])),
  discount_value numeric not null,
  min_purchase_amount numeric default 0,
  applicable_plan_ids jsonb,
  starts_at timestamptz default now(),
  expires_at timestamptz,
  single_use_per_account boolean default false,
  single_use_global boolean default false,
  non_stackable boolean default true,
  max_uses_global integer,
  affiliate_profile_id uuid references public.affiliate_profile(id)
);

-- Órdenes y pagos
create table public."order" (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid references public.user_profile(id),
  guest_email text,
  guest_phone text,
  plan_id uuid not null references public.plan(id),
  price_paid numeric not null,
  currency_sale text default 'USD',
  fx_rate_eur numeric,
  coupon_id uuid references public.coupon(id),
  discount_applied numeric default 0,
  affiliate_credit_applied numeric default 0,
  terms_accepted boolean not null default true,
  terms_accepted_at timestamptz default now(),
  stripe_payment_intent_id text unique,
  channel text default 'web' check (channel = any (array['web'::text, 'wholesale'::text, 'affiliate'::text])),
  affiliate_profile_id uuid references public.affiliate_profile(id),
  status text default 'pending' check (status = any (array['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text])),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint order_check check ((user_id is not null) or (guest_email is not null))
);

create table public.coupon_redemption (
  id uuid primary key default extensions.uuid_generate_v4(),
  coupon_id uuid not null references public.coupon(id),
  order_id uuid not null references public."order"(id),
  user_id uuid references public.user_profile(id),
  redeemed_at timestamptz default now()
);

create table public.stripe_event (
  id uuid primary key default extensions.uuid_generate_v4(),
  stripe_event_id text not null unique,
  event_type text not null,
  processing_result text,
  received_at timestamptz default now()
);

-- eSIMs y entrega
create table public.esim (
  id uuid primary key default extensions.uuid_generate_v4(),
  order_id uuid not null references public."order"(id),
  user_id uuid references public.user_profile(id),
  agency_profile_id uuid references public.agency_profile(id),
  iccid text unique,
  yesim_user_id text,
  qr_lpa text,
  ios_tap_link text,
  esim_passport_url text,
  status_qr text default 'generated' check (status_qr = any (array['generated'::text, 'installed'::text, 'active'::text, 'expired'::text])),
  plan_activated_at timestamptz,
  plan_expired_at timestamptz,
  created_at timestamptz default now()
);

create table public.qr_delivery (
  id uuid primary key default extensions.uuid_generate_v4(),
  esim_id uuid not null references public.esim(id),
  channel text check (channel = any (array['email'::text, 'whatsapp'::text])),
  status text default 'pending' check (status = any (array['pending'::text, 'sent'::text, 'failed'::text])),
  resend_count integer default 0,
  lang_used text,
  sent_at timestamptz,
  last_attempt_at timestamptz default now()
);

-- Afiliados: comisiones y créditos
create table public.commission_movement (
  id uuid primary key default extensions.uuid_generate_v4(),
  affiliate_profile_id uuid not null references public.affiliate_profile(id),
  order_id uuid not null references public."order"(id),
  amount numeric not null,
  currency text default 'USD',
  level integer default 1,
  status text default 'pending' check (status = any (array['pending'::text, 'available'::text, 'paid'::text, 'cancelled'::text])),
  created_at timestamptz default now()
);

create table public.withdrawal_request (
  id uuid primary key default extensions.uuid_generate_v4(),
  affiliate_profile_id uuid not null references public.affiliate_profile(id),
  amount numeric not null,
  status text default 'pending' check (status = any (array['pending'::text, 'approved'::text, 'paid'::text, 'rejected'::text])),
  requested_at timestamptz default now(),
  paid_at timestamptz
);

create table public.affiliate_credit (
  id uuid primary key default extensions.uuid_generate_v4(),
  affiliate_profile_id uuid not null references public.affiliate_profile(id),
  movement_type text check (movement_type = any (array['earned'::text, 'spent'::text, 'adjusted'::text])),
  amount numeric not null,
  order_id uuid references public."order"(id),
  created_at timestamptz default now()
);

-- Soporte
create table public.support_ticket (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid references public.user_profile(id),
  order_id uuid references public."order"(id),
  channel text,
  status text default 'open' check (status = any (array['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])),
  priority text default 'normal' check (priority = any (array['low'::text, 'normal'::text, 'high'::text, 'critical'::text])),
  sla_deadline timestamptz,
  bot_conversation_history jsonb,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table public.kb_article (
  id uuid primary key default extensions.uuid_generate_v4(),
  title text not null,
  content text not null,
  embedding vector,
  category text,
  updated_at timestamptz default now()
);

create table public.unresolved_query (
  id uuid primary key default extensions.uuid_generate_v4(),
  query_text text not null,
  category text,
  frequency integer default 1,
  suggested_for_faq boolean default false,
  last_seen_at timestamptz default now()
);

-- Auditoría
create table public.audit_log (
  id uuid primary key default extensions.uuid_generate_v4(),
  action text not null,
  actor_id uuid references public.user_profile(id),
  actor_type text,
  payload jsonb,
  occurred_at timestamptz default now()
);

-- ── Índices ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_coupon_code ON public.coupon USING btree (code);
CREATE INDEX idx_esim_order_id ON public.esim USING btree (order_id);
CREATE INDEX idx_esim_user_id ON public.esim USING btree (user_id);
CREATE INDEX idx_order_stripe_payment_intent_id ON public."order" USING btree (stripe_payment_intent_id);
CREATE INDEX idx_order_user_id ON public."order" USING btree (user_id);
CREATE INDEX idx_plan_yesim_id ON public.plan USING btree (yesim_id);
CREATE INDEX idx_user_profile_auth_user_id ON public.user_profile USING btree (auth_user_id);
CREATE INDEX idx_user_profile_email ON public.user_profile USING btree (email);

-- ── Triggers ────────────────────────────────────────────────────────────────
CREATE TRIGGER tg_user_profile_updated_at BEFORE UPDATE ON public.user_profile FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER tg_plan_pricing_updated_at BEFORE UPDATE ON public.plan_pricing FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER tg_order_updated_at BEFORE UPDATE ON public."order" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER tg_kb_article_updated_at BEFORE UPDATE ON public.kb_article FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER tg_calculate_plan_pricing BEFORE INSERT OR UPDATE ON public.plan_pricing FOR EACH ROW EXECUTE FUNCTION calculate_plan_pricing();
CREATE TRIGGER tg_log_price_history AFTER UPDATE ON public.plan_pricing FOR EACH ROW EXECUTE FUNCTION log_price_history();
CREATE TRIGGER tg_log_order_status_change AFTER UPDATE ON public."order" FOR EACH ROW EXECUTE FUNCTION log_order_status_change();
CREATE TRIGGER tr_audit_log_immutable BEFORE DELETE OR UPDATE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
CREATE TRIGGER tr_audit_order_changes AFTER INSERT OR DELETE OR UPDATE ON public."order" FOR EACH ROW EXECUTE FUNCTION auto_log_critical_tables();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.user_profile enable row level security;
alter table public.role enable row level security;
alter table public.user_role enable row level security;
alter table public.admin_profile enable row level security;
alter table public.affiliate_profile enable row level security;
alter table public.agency_profile enable row level security;
alter table public.gdpr_consent enable row level security;
alter table public.plan enable row level security;
alter table public.plan_pricing enable row level security;
alter table public.price_history enable row level security;
alter table public.device_compat enable row level security;
alter table public.coupon enable row level security;
alter table public."order" enable row level security;
alter table public.coupon_redemption enable row level security;
alter table public.stripe_event enable row level security;
alter table public.esim enable row level security;
alter table public.qr_delivery enable row level security;
alter table public.commission_movement enable row level security;
alter table public.withdrawal_request enable row level security;
alter table public.affiliate_credit enable row level security;
alter table public.support_ticket enable row level security;
alter table public.kb_article enable row level security;
alter table public.unresolved_query enable row level security;
alter table public.audit_log enable row level security;

-- ── Policies ────────────────────────────────────────────────────────────────
-- NOTA: las policies de escritura pública originales (ord_ins, stripe_ins,
-- coupon_redem_ins y la cláusula user_id IS NULL de ord_upd) se eliminan en la
-- migración de endurecimiento posterior; acá se preservan como foto fiel.

create policy usr_prof_ins on public.user_profile for insert with check (id = auth.uid());
create policy usr_prof_sel on public.user_profile for select using ((id = auth.uid()) or is_admin());
create policy usr_prof_upd on public.user_profile for update using ((id = auth.uid()) or is_admin());

create policy role_all on public.role for all using (is_admin());
create policy role_sel on public.role for select using (true);

create policy usr_role_all on public.user_role for all using (is_admin());
create policy usr_role_sel on public.user_role for select using ((user_id = auth.uid()) or is_admin());

create policy admin_prof_all on public.admin_profile for all using (is_admin());
create policy admin_prof_sel on public.admin_profile for select using ((user_id = auth.uid()) or is_admin());

create policy aff_prof_sel on public.affiliate_profile for select using ((user_id = auth.uid()) or is_admin());
create policy aff_prof_upd on public.affiliate_profile for update using ((user_id = auth.uid()) or is_admin());

create policy agy_prof_sel on public.agency_profile for select using ((user_id = auth.uid()) or is_admin());
create policy agy_prof_upd on public.agency_profile for update using ((user_id = auth.uid()) or is_admin());

create policy gdpr_ins on public.gdpr_consent for insert with check (user_id = auth.uid());
create policy gdpr_sel on public.gdpr_consent for select using ((user_id = auth.uid()) or is_admin());

create policy plan_all on public.plan for all using (is_admin());
create policy plan_sel on public.plan for select using (true);

create policy plan_prc_all on public.plan_pricing for all using (is_admin());
create policy plan_prc_sel on public.plan_pricing for select using (true);

create policy prc_hist_all on public.price_history for all using (is_admin());
create policy prc_hist_sel on public.price_history for select using (is_admin());

create policy dev_cmp_all on public.device_compat for all using (is_admin());
create policy dev_cmp_sel on public.device_compat for select using (true);

create policy coupon_all on public.coupon for all using (is_admin());
create policy coupon_sel on public.coupon for select using (true);

create policy ord_ins on public."order" for insert with check (true);
create policy ord_sel on public."order" for select using ((user_id = auth.uid()) or is_admin());
create policy ord_upd on public."order" for update using ((user_id = auth.uid()) or (user_id is null) or is_admin());

create policy coupon_redem_ins on public.coupon_redemption for insert with check ((user_id = auth.uid()) or (user_id is null));
create policy coupon_redem_sel on public.coupon_redemption for select using ((user_id = auth.uid()) or is_admin());

create policy stripe_ins on public.stripe_event for insert with check (true);
create policy stripe_sel on public.stripe_event for select using (is_admin());

create policy esim_all on public.esim for all using (is_admin());
create policy esim_sel on public.esim for select using ((user_id = auth.uid()) or is_admin());

create policy qr_sel on public.qr_delivery for select using ((exists (select 1 from esim where (esim.id = qr_delivery.esim_id) and (esim.user_id = auth.uid()))) or is_admin());

create policy comm_sel on public.commission_movement for select using ((exists (select 1 from affiliate_profile where (affiliate_profile.id = commission_movement.affiliate_profile_id) and (affiliate_profile.user_id = auth.uid()))) or is_admin());

create policy withd_ins on public.withdrawal_request for insert with check (exists (select 1 from affiliate_profile where (affiliate_profile.id = withdrawal_request.affiliate_profile_id) and (affiliate_profile.user_id = auth.uid())));
create policy withd_sel on public.withdrawal_request for select using ((exists (select 1 from affiliate_profile where (affiliate_profile.id = withdrawal_request.affiliate_profile_id) and (affiliate_profile.user_id = auth.uid()))) or is_admin());

create policy aff_cred_sel on public.affiliate_credit for select using ((exists (select 1 from affiliate_profile where (affiliate_profile.id = affiliate_credit.affiliate_profile_id) and (affiliate_profile.user_id = auth.uid()))) or is_admin());

create policy ticket_ins on public.support_ticket for insert with check (user_id = auth.uid());
create policy ticket_sel on public.support_ticket for select using ((user_id = auth.uid()) or is_admin());
create policy ticket_upd on public.support_ticket for update using ((user_id = auth.uid()) or is_admin());

create policy kb_all on public.kb_article for all using (is_admin());
create policy kb_sel on public.kb_article for select using (true);

create policy unres_all on public.unresolved_query for all using (is_admin());

create policy audit_all on public.audit_log for all using (is_admin());
