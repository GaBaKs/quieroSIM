# Planning — Panel de Administración QuieroSIM
> Stack: Next.js 14+ · Supabase · API YeSim · Stripe
> Scope: Solo panel de administración (la landing ya existe)
> Versión: 2.0 — basada en RF v1.1 + auditoría del código actual
> Progreso: se registra en `tasks.md`

---

## Estética aplicada

El panel sigue la guía de diseño de QuieroSIM:
- **Primario:** `#9933c1` con hover `#7100a5`
- **Acento:** `#b3ff6b` para badges, alertas de éxito y CTAs de alto impacto
- **Fondo general:** `#18181b` (dark theme) con cards en `bg-zinc-900` o `bg-[#fafafa]` según contexto
- **Bordes y glassmorphism:** `backdrop-blur-md`, bordes `border-black/5` o `border-white/10`
- **Tipografía:** `font-sans`, títulos `font-black tracking-tight`, badges `text-xs uppercase font-bold tracking-[0.2em]`
- **Botones:** Componente `QuieroButton` pseudo-3D (neobrutalista)
- **Radios:** `rounded-xl` / `rounded-2xl` en todos los contenedores
- **Animaciones:** Framer Motion con `useScrollReveal` para entradas en cascada

---

## Estado actual — Inventario de lo existente

### ✅ Ya implementado (lógica + diseño)

| Módulo | Archivos clave | Estado |
|---|---|---|
| Layout admin (sidebar + topbar + tema) | `AdminShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `ThemeProvider.tsx` | Completo |
| Login admin (dark, bypass temporal) | `app/admin/login/page.tsx` | Completo (sin Supabase Auth real) |
| Guard de sesión + roles | `app/admin/(panel)/layout.tsx`, `proxy.ts`, `server/lib/auth.ts` | Lógica conectada a Supabase |
| Dashboard con KPIs | `DashboardView.tsx`, `admin-dashboard.ts` | Lógica conectada, diseño listo |
| Listado de órdenes con filtros + paginación | `app/admin/(panel)/orders/page.tsx`, `OrderFilters.tsx`, `admin-orders.ts` | Lógica conectada, diseño listo |
| Detalle de orden | `app/admin/(panel)/orders/[id]/page.tsx`, `OrderDetailView.tsx` | Lógica conectada, diseño listo |
| Listado de usuarios con búsqueda + paginación | `app/admin/(panel)/users/page.tsx`, `UserSearch.tsx`, `admin-users.ts` | Lógica conectada, diseño listo |
| Detalle de usuario | `app/admin/(panel)/users/[id]/page.tsx`, `UserDetailView.tsx` | Lógica conectada, diseño listo |
| Gestión de planes (listado + edición inline) | `app/admin/(panel)/plans/page.tsx`, `PlansView.tsx`, `admin-plans.ts` | Lógica conectada, diseño listo |
| Gestión de cupones (CRUD completo) | `app/admin/(panel)/coupons/page.tsx`, `CouponsView.tsx`, `admin-coupons.ts` | Lógica conectada, diseño listo |
| StatusBadge, ConfirmDialog, format helpers | `StatusBadge.tsx`, `ConfirmDialog.tsx`, `format.ts` | Componentes utilitarios completos |
| Sidebar con ítems por rol | `Sidebar.tsx` (filtra por `superAdminOnly`) | Funcional |
| Navegación landing ↔ admin ↔ account | `Navbar.tsx`, `Topbar.tsx`, `account/layout.tsx` | Botones Acceder / Vista Usuario / Ver Web |

### 🔲 Sin implementar (sidebar dice "Pronto")

| Módulo | Requiere lógica backend | Acción |
|---|---|---|
| Afiliados (`/admin/affiliates`) | Sí (tablas `affiliate_profile`, `commission_movement`, etc.) | **Datos mock** |
| Mayoristas (`/admin/wholesale`) | Sí (tablas `agency_profile`, eSIM en lote) | **Datos mock** |
| Soporte y Tickets (`/admin/support`) | Sí (tabla `support_ticket`, bot IA, WhatsApp) | **Datos mock** |
| Reportes y Finanzas (`/admin/reports`) | Sí (queries agregadas, export CSV/PDF) | **Datos mock** |
| Configuración (`/admin/settings`) | Sí (tabla `settings` key-value) | **Datos mock** |

---

## Fase 1 — Dashboard: gráfico de ventas y estado del sistema ✅

**RF cubiertos:** RF-ADM-01
**Estado:** YA IMPLEMENTADO — `DashboardView.tsx` tiene KPIs, gráfico de ventas (30 días), top 5 planes y health check.

- [x] 4 cards de KPIs con fadeUp y badges de variación
- [x] Gráfico de línea (últimos 30 días) estilizado en `#9933c1`
- [x] Top 5 planes más vendidos con badges en `#b3ff6b`
- [x] Estado del sistema (YeSim, Stripe, WhatsApp) con semáforo
- [x] Lógica conectada a Supabase via `admin-dashboard.ts`

> No se requiere acción.

---

## Fase 2 — Órdenes: listado y detalle ✅

**RF cubiertos:** RF-ADM-02
**Estado:** YA IMPLEMENTADO — tabla con filtros, paginación y detalle por orden.

- [x] Tabla: ID, Email, Plan, Monto, Estado, Fecha
- [x] Badges de estado con colores (Pendiente, Completada, Reembolsada)
- [x] Filtros por estado + buscador por ID/email
- [x] Paginación con botones estilizados en violeta
- [x] Detalle de orden en `/admin/orders/[id]`
- [x] Lógica conectada a Supabase via `admin-orders.ts`

> No se requiere acción.

---

## Fase 3 — Usuarios: listado y detalle ✅

**RF cubiertos:** RF-ADM-03
**Estado:** YA IMPLEMENTADO — tabla con búsqueda, paginación y detalle.

- [x] Tabla: Email, Nombre, Roles, Estado, Alta
- [x] Búsqueda por nombre o email
- [x] Detalle con historial de compras y acciones (bloquear/cambiar rol)
- [x] Lógica conectada a Supabase via `admin-users.ts`

> No se requiere acción.

---

## Fase 4 — Planes y precios ✅

**RF cubiertos:** RF-ADM-04, RF-PRC-01, RF-PRC-02, RF-PRC-05
**Estado:** YA IMPLEMENTADO — listado con edición inline de margen/precio fijo.

- [x] Tabla con toggle activo/inactivo y badge FUP
- [x] Edición inline: margen %, precio fijo, cálculo automático
- [x] Permisos: solo super_admin puede editar
- [x] Lógica conectada a Supabase via `admin-plans.ts`

### Pendiente de diseño (lógica NO implementada → datos mock):
- [ ] Historial de precios: sección colapsable por plan — **RF-PRC-06** → `tasks.md #PLAN-HIST-01`
- [ ] Alertas de cambio de precio: banner con badge rojo — **RF-PRC-03, RF-PRC-04** → `tasks.md #PLAN-ALERT-01`

---

## Fase 5 — Cupones ✅

**RF cubiertos:** RF-ADM-05, RF-CUP-01 a RF-CUP-06
**Estado:** YA IMPLEMENTADO — CRUD completo con modal de creación.

- [x] Tabla: Código, Tipo, Descuento, Usos, Vencimiento, Estado
- [x] Modal de creación con todos los campos del requerimiento
- [x] Badge de estado (Activo/Vencido/Pausado)
- [x] Lógica conectada a Supabase via `admin-coupons.ts`

### Pendiente de diseño (lógica NO implementada → datos mock):
- [ ] Reporte por cupón: panel expandible con métricas — **RF-CUP-07** → `tasks.md #CUP-REPORT-01`

---

## Fase 6 — Afiliados (NUEVO — datos mock)

**RF cubiertos:** RF-ADM-06, RF-AFF-01 a RF-AFF-08
**Estado:** Solo sidebar entry (deshabilitado). Sin página ni lógica. Crearemos diseño completo con datos mock.

### 6.1 Listado de afiliados
- [ ] Página `/admin/affiliates` con tabla mock → `tasks.md #AFF-LIST-01`
- [ ] Columnas: Nombre, Canal, Audiencia, Estado, Ventas, Comisión pendiente, Comisión pagada
- [ ] Badges: Pendiente (amarillo), Activo (verde `#b3ff6b`), Suspendido (rojo)
- [ ] Filtro por estado

### 6.2 Detalle de afiliado (modal o drawer)
- [ ] Datos del formulario de solicitud → `tasks.md #AFF-DETAIL-01`
- [ ] Link de referido y cupón propio
- [ ] Tabla de ventas referidas (mock)
- [ ] Botones: Aprobar / Suspender / Marcar comisión como pagada
- [ ] Indicador multinivel (Nivel 1 → Nivel 2) — RF-AFF-04

---

## Fase 7 — Mayoristas (NUEVO — datos mock)

**RF cubiertos:** RF-MAY-01 a RF-MAY-05
**Estado:** Solo sidebar entry (deshabilitado). Sin página ni lógica. Crearemos diseño completo con datos mock.

### 7.1 Listado de agencias
- [ ] Página `/admin/wholesale` con tabla mock → `tasks.md #MAY-LIST-01`
- [ ] Columnas: Empresa, Email, Estado, Órdenes, Monto total
- [ ] Filtro por estado de aprobación

### 7.2 Detalle de agencia (modal)
- [ ] Historial de compras en lote (mock) → `tasks.md #MAY-DETAIL-01`
- [ ] Estado de eSIMs del lote: sin asignar / asignada / activada
- [ ] Configuración de margen mayorista específico

---

## Fase 8 — Soporte y Tickets (NUEVO — datos mock)

**RF cubiertos:** RF-SUP-01 a RF-SUP-08
**Estado:** Solo sidebar entry (deshabilitado). Sin página ni lógica. Crearemos diseño completo con datos mock.

### 8.1 Listado de tickets
- [ ] Página `/admin/support` con tabla mock → `tasks.md #SUP-LIST-01`
- [ ] Columnas: ID, Cliente, Canal (chat/email/WhatsApp), Estado, Prioridad, Agente, Tiempo
- [ ] Badges de prioridad: Alta (rojo), Media (amarillo), Baja (gris)
- [ ] Filtros por estado, canal, agente

### 8.2 Detalle de ticket (modal o drawer)
- [ ] Timeline de conversación bot + cliente (mock) → `tasks.md #SUP-DETAIL-01`
- [ ] Caja de respuesta del agente
- [ ] Botones: Cerrar, Cambiar prioridad, Asignar agente

### 8.3 Knowledge Base detectado
- [ ] Listado de consultas sin respuesta (mock) → `tasks.md #SUP-KB-01`
- [ ] Badge "Sugerido" en `#b3ff6b` para frecuencia > umbral
- [ ] Botón "Agregar al KB"

---

## Fase 9 — Reportes y Finanzas (NUEVO — datos mock)

**RF cubiertos:** RF-REP-01 a RF-REP-05
**Estado:** Solo sidebar entry (deshabilitado). Sin página ni lógica. Solo visible para super_admin.

### 9.1 Informe de ventas
- [ ] Página `/admin/reports` con gráfico de barras mock → `tasks.md #REP-SALES-01`
- [ ] Filtros: período, país, plan, canal
- [ ] Tabla resumen con botón exportar (simulado)

### 9.2 Informe financiero anual
- [ ] Tab o sección con desglose mensual mock → `tasks.md #REP-FINANCE-01`
- [ ] Ingresos, costo de ventas, margen bruto
- [ ] Botones CSV / PDF (simulado)

### 9.3 Informe de afiliados
- [ ] Tab con comisiones por afiliado (mock) → `tasks.md #REP-AFF-01`

### 9.4 Informe de reembolsos
- [ ] Tab con historial de reembolsos (mock) → `tasks.md #REP-REFUND-01`

---

## Fase 10 — Configuración global (NUEVO — datos mock)

**RF cubiertos:** RF-ADM-07 (roles admin) + configuración general
**Estado:** Solo sidebar entry (deshabilitado). Sin página ni lógica.

### 10.1 Configuración general
- [ ] Página `/admin/settings` con formulario mock → `tasks.md #CFG-GENERAL-01`
- [ ] Campos: nombre tienda, moneda, email de soporte, logo
- [ ] Toggle modo mantenimiento

### 10.2 Márgenes globales
- [ ] Margen default nuevos planes → `tasks.md #CFG-MARGINS-01`
- [ ] Margen mayoristas
- [ ] Comisión afiliados nivel 1 y 2

### 10.3 Umbrales de alerta
- [ ] % variación precio para alerta (default 5%) → `tasks.md #CFG-THRESHOLDS-01`
- [ ] Mínimo retiro comisiones (default USD 50)
- [ ] Umbral FAQs detectadas (default 5)

### 10.4 Gestión de roles admin
- [ ] Tabla de admins con rol (Super Admin / Agente) → `tasks.md #CFG-ROLES-01`
- [ ] Botones: Invitar, Cambiar rol, Revocar

---

## Notas generales de implementación

- Todos los componentes deben seguir la guía de estética de QuieroSIM (colores, `QuieroButton`, radios, animaciones).
- La vista de escritorio es la prioritaria para el panel admin, pero debe ser responsiva.
- Las tablas deben soportar ordenamiento por columna.
- Las acciones destructivas (bloquear usuario, aprobar reembolso) deben requerir un modal de confirmación (`ConfirmDialog.tsx` ya existe).
- Todas las acciones críticas deben quedar registradas en tabla `audit_log` con timestamp y user_id (RNF-08).
- **Las fases 6-10 usarán datos mock hardcodeados** ya que la lógica backend no está implementada. Cuando se implemente la lógica, se reemplazarán los mock por queries reales.