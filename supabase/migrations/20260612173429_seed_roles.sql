-- Roles del sistema (RF-AUTH-02). El sub-rol de admin vive en admin_profile.sub_role.
insert into public.role (name, description) values
  ('customer', 'Cliente final: compra eSIMs, ve sus órdenes y eSIMs'),
  ('affiliate', 'Afiliado: link/cupón de referido, comisiones 2 niveles, retiros'),
  ('agency', 'Agencia mayorista: precios wholesale, compra en lote, inventario'),
  ('admin', 'Administrador: opera el sistema (sub-rol en admin_profile)')
on conflict (name) do nothing;
