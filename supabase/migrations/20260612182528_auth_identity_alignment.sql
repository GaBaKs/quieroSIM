-- Alinea user_profile.id con auth.users.id. Las 45 policies RLS comparan
-- user_profile.id (o FKs hacia él) contra auth.uid(); sin esta alineación
-- ninguna policy de usuario funciona (is_admin() daba false para el admin real).

-- 1. Backfill: cascada temporal en los FKs con filas hoy (user_role, admin_profile).
alter table public.user_role drop constraint user_role_user_id_fkey;
alter table public.user_role add constraint user_role_user_id_fkey
  foreign key (user_id) references public.user_profile(id) on update cascade;
alter table public.user_role drop constraint user_role_assigned_by_fkey;
alter table public.user_role add constraint user_role_assigned_by_fkey
  foreign key (assigned_by) references public.user_profile(id) on update cascade;
alter table public.admin_profile drop constraint admin_profile_user_id_fkey;
alter table public.admin_profile add constraint admin_profile_user_id_fkey
  foreign key (user_id) references public.user_profile(id) on update cascade;

update public.user_profile set id = auth_user_id
where auth_user_id is not null and id <> auth_user_id;

-- Restaurar los FKs sin cascade (el id no debe cambiar en operación normal).
alter table public.user_role drop constraint user_role_user_id_fkey;
alter table public.user_role add constraint user_role_user_id_fkey
  foreign key (user_id) references public.user_profile(id);
alter table public.user_role drop constraint user_role_assigned_by_fkey;
alter table public.user_role add constraint user_role_assigned_by_fkey
  foreign key (assigned_by) references public.user_profile(id);
alter table public.admin_profile drop constraint admin_profile_user_id_fkey;
alter table public.admin_profile add constraint admin_profile_user_id_fkey
  foreign key (user_id) references public.user_profile(id);

-- 2. Alta automática: cada signup en auth.users crea su user_profile (id = auth id)
--    y recibe el rol customer. Roles superiores se asignan manualmente/por admin.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_role uuid;
begin
  insert into public.user_profile (id, auth_user_id, email, full_name, lang_pref)
  values (
    new.id,
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'lang', 'ES')
  )
  on conflict do nothing;

  select id into v_customer_role from public.role where name = 'customer';
  if v_customer_role is not null then
    insert into public.user_role (user_id, role_id)
    select new.id, v_customer_role
    where not exists (
      select 1 from public.user_role where user_id = new.id and role_id = v_customer_role
    );
  end if;

  return new;
end;
$$;

create trigger tg_handle_new_auth_user
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
