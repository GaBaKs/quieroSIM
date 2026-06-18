# Tasks — Panel de Administración QuieroSIM
> Registro de tareas del `Planningadmin.md`
> `[x]` = completada · `[/]` = en progreso · `[ ]` = pendiente

---

## Fase 1 — Dashboard ✅
- [x] KPIs con fadeUp y badges de variación
- [x] Gráfico de ventas (30 días) en `#9933c1`
- [x] Top 5 planes más vendidos
- [x] Estado del sistema (health check)

## Fase 2 — Órdenes ✅
- [x] Tabla con filtros + paginación
- [x] Badges de estado
- [x] Buscador por ID/email
- [x] Detalle de orden `/admin/orders/[id]`

## Fase 3 — Usuarios ✅
- [x] Tabla con búsqueda + paginación
- [x] Detalle con historial de compras
- [x] Acciones (bloquear/cambiar rol)

## Fase 4 — Planes y precios ✅ (parcial)
- [x] Tabla con toggle activo/inactivo + badge FUP
- [x] Edición inline: margen %, precio fijo
- [x] Permisos super_admin para edición
- [ ] `#PLAN-HIST-01` — Historial de precios: sección colapsable con datos mock
- [ ] `#PLAN-ALERT-01` — Alertas de cambio de precio: banner con badge rojo y datos mock

## Fase 5 — Cupones ✅ (parcial)
- [x] CRUD completo con modal
- [x] Tabla con todos los campos
- [x] Badges de estado
- [ ] `#CUP-REPORT-01` — Reporte por cupón: panel expandible con métricas mock

---

## Fase 6 — Afiliados (datos mock)
- [x] `#AFF-LIST-01` — Página `/admin/affiliates` con tabla mock
  - [x] Columnas: Nombre, Canal, Audiencia, Estado, Ventas, Comisión pendiente/pagada
  - [x] Badges por estado
  - [x] Filtro por estado
- [x] `#AFF-DETAIL-01` — Detalle de afiliado (drawer)
  - [x] Datos del formulario de solicitud
  - [x] Link de referido + cupón
  - [x] Tabla de ventas referidas mock
  - [x] Botones: Aprobar / Suspender / Marcar pagada
  - [x] Indicador multinivel (Nivel 1 → Nivel 2)

## Fase 7 — Mayoristas (datos mock)
- [x] `#MAY-LIST-01` — Página `/admin/wholesale` con tabla mock
  - [x] Columnas: Empresa, Email, Estado, Órdenes, Monto
  - [x] Filtro por estado
- [x] `#MAY-DETAIL-01` — Detalle de agencia (modal)
  - [x] Historial compras en lote mock
  - [x] Estado eSIMs: sin asignar / asignada / activada
  - [x] Config margen mayorista

## Fase 8 — Soporte y Tickets (datos mock)
- [x] `#SUP-LIST-01` — Página `/admin/support` con tabla mock
  - [x] Columnas: ID, Cliente, Canal, Estado, Prioridad, Agente, Tiempo
  - [x] Badges prioridad
  - [x] Filtros
- [x] `#SUP-DETAIL-01` — Detalle de ticket (modal/drawer)
  - [x] Timeline conversación mock
  - [x] Caja de respuesta
  - [x] Botones: Cerrar, Cambiar prioridad, Asignar
- [x] `#SUP-KB-01` — Knowledge Base detectado
  - [x] Listado consultas sin respuesta mock
  - [x] Badge "Sugerido"
  - [x] Botón "Agregar al KB"

## Fase 9 — Reportes y Finanzas (datos mock)
- [x] `#REP-SALES-01` — Informe de ventas con gráfico mock
  - [x] Filtros: período, país, plan, canal
  - [x] Tabla resumen + botón exportar (simulado)
- [x] `#REP-FINANCE-01` — Informe financiero anual mock
  - [x] Desglose mensual: ingresos, costo, margen
  - [x] Botones CSV / PDF (simulado)
- [x] `#REP-AFF-01` — Informe de afiliados mock
- [x] `#REP-REFUND-01` — Informe de reembolsos mock

## Fase 10 — Configuración global (datos mock)
- [x] `#CFG-GENERAL-01` — Formulario config general
  - [x] Nombre tienda, moneda, email soporte, logo
  - [x] Toggle mantenimiento
- [x] `#CFG-MARGINS-01` — Márgenes globales
  - [x] Default planes, mayoristas, comisiones afiliados
- [x] `#CFG-THRESHOLDS-01` — Umbrales de alerta
  - [x] % variación precio, mínimo retiro, umbral FAQs
- [x] `#CFG-ROLES-01` — Gestión roles admin
  - [x] Tabla admins con rol
  - [x] Invitar / Cambiar rol / Revocar
