-- Opción A: la tabla de competencia aplica también a LatAm (igual que el PDF).
-- El MAX(competencia, piso) resuelve solo por plan: planes chicos → competencia,
-- grandes/ilimitados → piso. Mismos 11 anclas que el grupo Default.
insert into group_competitor_price (group_id, is_unlimited, data_amount, duration_days, competitor_usd, label, sort_order)
select g.id, v.is_unl, v.da, v.dur, v.comp, v.lbl, v.so
from country_group g
cross join (values
  (false, '0.49', 1,  1.99::numeric, '0,49 GB / 1 día',  1),
  (false, '1',    7,  3.50,          '1 GB / 7 días',    2),
  (false, '3',    7,  8.95,          '3 GB / 7 días',    3),
  (false, '5',    15, 9.45,          '5 GB / 15 días',   4),
  (false, '10',   30, 17.95,         '10 GB / 30 días',  5),
  (false, '15',   30, 24.00,         '15 GB / 30 días',  6),
  (false, '20',   30, 33.95,         '20 GB / 30 días',  7),
  (false, '30',   30, 37.00,         '30 GB / 30 días',  8),
  (true,  'NaN',  7,  25.00,         'Ilimitado 7 días', 9),
  (true,  'NaN',  15, 45.00,         'Ilimitado 15 días',10),
  (true,  'NaN',  30, 55.00,         'Ilimitado 30 días',11)
) as v(is_unl, da, dur, comp, lbl, so)
where g.slug = 'latam'
on conflict (group_id, data_amount, duration_days) do nothing;
