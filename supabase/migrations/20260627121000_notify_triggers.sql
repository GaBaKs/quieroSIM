-- Triggers que avisan a la Edge notify (vía pg_net + x-cron-secret del Vault).
-- Best-effort: cualquier error del aviso se ignora, NUNCA rompe la venta/ticket.

create or replace function public.tg_notify_sale()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    perform net.http_post(
      url := 'https://kusubcnxazjqozfjxbcf.supabase.co/functions/v1/notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      body := jsonb_build_object('kind', 'sale', 'orderId', NEW.id)
    );
  exception when others then null; -- aviso best-effort
  end;
  return NEW;
end; $$;

drop trigger if exists trg_notify_sale on public."order";
create trigger trg_notify_sale
  after update of status on public."order"
  for each row
  when (NEW.status = 'paid' and OLD.status is distinct from 'paid' and coalesce(NEW.price_paid, 0) > 0)
  execute function public.tg_notify_sale();

create or replace function public.tg_notify_claim()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    perform net.http_post(
      url := 'https://kusubcnxazjqozfjxbcf.supabase.co/functions/v1/notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      body := jsonb_build_object('kind', 'claim', 'ticketId', NEW.id)
    );
  exception when others then null;
  end;
  return NEW;
end; $$;

drop trigger if exists trg_notify_claim on public.support_ticket;
create trigger trg_notify_claim
  after insert on public.support_ticket
  for each row
  execute function public.tg_notify_claim();
