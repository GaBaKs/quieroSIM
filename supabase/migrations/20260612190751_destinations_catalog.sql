-- Catálogo de destinos de la landing (Etapa 4). Curaduría de negocio (nombres,
-- aliases de búsqueda, popular, región) separada de los planes que se
-- sincronizan desde YeSim. destination.iso_match une con plan.iso_country.

create table public.destination (
  id uuid primary key default extensions.uuid_generate_v4(),
  slug text not null unique, -- el Hero referencia estos slugs (eeuu, espana, ...)
  name text not null,
  code text not null,
  region text not null check (region = any (array['Americas'::text, 'Europe'::text, 'Asia'::text, 'Africa'::text, 'Global'::text])),
  popular boolean default false,
  flag text not null,
  search_aliases jsonb not null default '[]'::jsonb,
  iso_match text, -- une con plan.iso_country (US, ES, ..., EU=regional, WW=global)
  sort_order integer default 100,
  status text default 'active' check (status = any (array['active'::text, 'inactive'::text]))
);

alter table public.destination enable row level security;
create policy destination_sel on public.destination for select using (true);
create policy destination_admin on public.destination for all using (is_admin());

insert into public.destination (slug, name, code, region, popular, flag, search_aliases, iso_match, sort_order) values
  ('eeuu', 'Estados Unidos', 'US', 'Americas', true, '🇺🇸', '["USA","US","EUA","UNITED STATES","EEUU","ESTADOS UNIDOS"]', 'US', 1),
  ('espana', 'España', 'ES', 'Europe', true, '🇪🇸', '["SPAIN","ES","ESPANA"]', 'ES', 2),
  ('italia', 'Italia', 'IT', 'Europe', true, '🇮🇹', '["ITALY","IT"]', 'IT', 3),
  ('francia', 'Francia', 'FR', 'Europe', true, '🇫🇷', '["FRANCE","FR"]', 'FR', 4),
  ('reino-unido', 'Reino Unido', 'GB', 'Europe', true, '🇬🇧', '["UK","UNITED KINGDOM","ENGLAND","INGLATERRA","GRAN BRETAÑA","GREAT BRITAIN","GB","LONDRES","LONDON"]', 'GB', 5),
  ('mexico', 'México', 'MX', 'Americas', true, '🇲🇽', '["MEXICO","MX"]', 'MX', 6),
  ('brasil', 'Brasil', 'BR', 'Americas', false, '🇧🇷', '["BRAZIL","BR"]', 'BR', 7),
  ('japon', 'Japón', 'JP', 'Asia', true, '🇯🇵', '["JAPAN","JP","NIPON"]', 'JP', 8),
  ('alemania', 'Alemania', 'DE', 'Europe', false, '🇩🇪', '["GERMANY","DE","DEUTSCHLAND"]', 'DE', 9),
  ('canada', 'Canadá', 'CA', 'Americas', false, '🇨🇦', '["CANADA","CA"]', 'CA', 10),
  ('colombia', 'Colombia', 'CO', 'Americas', false, '🇨🇴', '["COLOMBIA","CO"]', 'CO', 11),
  ('peru', 'Perú', 'PE', 'Americas', false, '🇵🇪', '["PERU","PE"]', 'PE', 12),
  ('chile', 'Chile', 'CL', 'Americas', false, '🇨🇱', '["CHILE","CL"]', 'CL', 13),
  ('argentina', 'Argentina', 'AR', 'Americas', false, '🇦🇷', '["ARGENTINA","AR"]', 'AR', 14),
  ('suiza', 'Suiza', 'CH', 'Europe', false, '🇨🇭', '["SWITZERLAND","CH","SUISSE"]', 'CH', 15),
  ('tailandia', 'Tailandia', 'TH', 'Asia', false, '🇹🇭', '["THAILAND","TH"]', 'TH', 16),
  ('turquia', 'Turquía', 'TR', 'Europe', true, '🇹🇷', '["TURKEY","TR","TÜRKIYE"]', 'TR', 17),
  ('egipto', 'Egipto', 'EG', 'Africa', false, '🇪🇬', '["EGYPT","EG"]', 'EG', 18),
  ('sudafrica', 'Sudáfrica', 'ZA', 'Africa', false, '🇿🇦', '["SOUTH AFRICA","ZA","SUD AFRICA"]', 'ZA', 19),
  ('europa-multi', 'Europa Regional', 'EU', 'Global', true, '🇪🇺', '["EUROPE","EU","EUROPA","UNION EUROPEA"]', 'EU', 20),
  ('latam-multi', 'América Latina', 'LATAM', 'Global', false, '🌎', '["LATAM","AMERICA LATINA","LATINOAMERICA","SOUTH AMERICA","SURAMERICA"]', 'LATAM', 21),
  ('global-multi', 'Global (85+ Países)', 'WORLD', 'Global', true, '🌐', '["MUNDIAL","TODO EL MUNDO","WORLDWIDE","GLOBAL","PLANETA","INTERNACIONAL"]', 'WW', 22);

-- Unicidad para que el cron de dispositivos haga upsert sin duplicar.
create unique index uq_device_compat_cat_brand_model on public.device_compat (category, brand, model);

-- Seed de dispositivos desde la lista curada del front (más rica que la del
-- mock); el cron de YeSim solo AGREGA modelos (upsert, sin deletes).
insert into public.device_compat (category, brand, model)
select 'PHONE', b.brand, m.model
from (values
  ('Apple', array['iPhone XR','iPhone XS','iPhone XS Max','iPhone 11','iPhone 11 Pro','iPhone 11 Pro Max','iPhone SE 2','iPhone SE 3','iPhone SE (2020)','iPhone SE (2022)','iPhone SE (2ª generación o posterior)','iPhone 12','iPhone 12 mini','iPhone 12 Pro','iPhone 12 Pro Max','iPhone 13','iPhone 13 mini','iPhone 13 Pro','iPhone 13 Pro Max','iPhone 14','iPhone 14 Plus','iPhone 14 Pro','iPhone 14 Pro Max','iPhone 15','iPhone 15 Plus','iPhone 15 Pro','iPhone 15 Pro Max','iPhone 16','iPhone 16 Plus','iPhone 16 Pro','iPhone 16 Pro Max','iPad Pro 11"','iPad Pro 12.9"','iPad Air (3rd Gen)','iPad Air (4th Gen)','iPad Air (5th Gen)']),
  ('Samsung', array['Galaxy S20','Galaxy S20+','Galaxy S20 Ultra','Galaxy S21','Galaxy S21+','Galaxy S21 Ultra','Galaxy S22','Galaxy S22+','Galaxy S22 Ultra','Galaxy S23','Galaxy S23+','Galaxy S23 Ultra','Galaxy S23 FE','Galaxy S24','Galaxy S24+','Galaxy S24 Ultra','Galaxy Note 20','Galaxy Note 20 Ultra','Galaxy Z Fold','Galaxy Z Fold 2','Galaxy Z Fold 3','Galaxy Z Fold 4','Galaxy Z Fold 5','Galaxy Z Flip','Galaxy Z Flip 3','Galaxy Z Flip 4','Galaxy Z Flip 5']),
  ('Google', array['Pixel 3','Pixel 3 XL','Pixel 4','Pixel 4 XL','Pixel 4a','Pixel 5','Pixel 5a','Pixel 6','Pixel 6 Pro','Pixel 6a','Pixel 7','Pixel 7 Pro','Pixel 7a','Pixel 8','Pixel 8 Pro','Pixel 8a','Pixel 9','Pixel 9 Pro','Pixel 9 Pro XL']),
  ('Otros', array['Motorola Razr 2019','Motorola Razr 5G','Motorola Razr 40 Ultra','Motorola Edge 40','Motorola Edge 40 Pro','Huawei P40','Huawei P40 Pro','Huawei Mate 40 Pro','Xiaomi 12T Pro','Xiaomi 13 Pro','Xiaomi 14 Ultra','Xiaomi 13T Pro','Sony Xperia 1 IV','Sony Xperia 10 IV','Sony Xperia 1 V','Oppo Find X5 Pro','Oppo Find X3 Pro'])
) as b(brand, models)
cross join lateral unnest(b.models) as m(model)
on conflict (category, brand, model) do nothing;
