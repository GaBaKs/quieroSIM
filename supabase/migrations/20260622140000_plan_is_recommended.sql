-- Marca manual del plan "recomendado/destacado" por destino (override del
-- auto-popular por mediana en buildCatalog). La setea el super_admin desde el panel.
alter table plan add column if not exists is_recommended boolean not null default false;
comment on column plan.is_recommended is 'Marca manual del admin: plan destacado en la landing (override del auto-popular por mediana).';
