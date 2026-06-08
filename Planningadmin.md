# Planning — Panel de Administración QuieroSIM
> Stack: Next.js 14+ · Supabase · API YeSim · Stripe
> Scope: Solo panel de administración (la landing ya existe)
> Versión: 1.0 — basada en RF v1.1

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

## Fase 1 — Estructura base y navegación del admin

**Objetivo:** Levantar el shell del panel: layout, sidebar, routing y autenticación de roles.

### 1.1 Layout del panel
- [ ] Crear ruta `/admin` con layout dedicado (sidebar + topbar)
- [ ] Sidebar con íconos y etiquetas: Dashboard, Órdenes, Usuarios, Planes, Cupones, Afiliados, Mayoristas, Soporte, Reportes, Configuración
- [ ] Topbar con avatar, nombre del admin y botón de logout
- [ ] Responsive: sidebar colapsable en mobile (drawer)
- [ ] Aplicar paleta oscura: fondo `#18181b`, sidebar en `bg-zinc-900`, texto `text-zinc-100`
- [ ] Bordes sutiles `border-white/10` entre secciones
- [ ] Transiciones de ruta con Framer Motion (`AnimatePresence`)

### 1.2 Autenticación y roles
- `TODO → tasks.md #AUTH-01` Proteger rutas `/admin/*` con middleware de Supabase Auth
- `TODO → tasks.md #AUTH-02` Verificar rol del usuario (Super Admin / Agente de Soporte) vía RLS
- `TODO → tasks.md #AUTH-03` Redirigir a login si sesión expirada
- `TODO → tasks.md #AUTH-04` Mostrar/ocultar ítems del sidebar según rol (Agente no ve sección Reportes ni Finanzas)

### 1.3 Página de login del admin
- [ ] Formulario de email + contraseña con estética dark
- [ ] Botón `QuieroButton` en violeta
- [ ] Logo QuieroSIM centrado, fondo con gradiente `from-[#18181b] to-black`
- `TODO → tasks.md #AUTH-05` Conectar con Supabase Auth

---

## Fase 2 — Dashboard principal

**Objetivo:** Vista de métricas clave (RF-ADM-01).

### 2.1 Tarjetas de KPIs
- [ ] 4 cards superiores: Ventas del día, Ventas del mes, Total órdenes, Ingresos
- [ ] Cards con fondo `bg-zinc-900`, borde `border-white/10`, radio `rounded-2xl`
- [ ] Badge de variación (↑/↓ respecto al día/mes anterior) en `#b3ff6b` o rojo según tendencia
- [ ] Animación fadeUp en cascada con Framer Motion al montar
- `TODO → tasks.md #DASH-01` Conectar cards con queries a Supabase (ventas, órdenes, ingresos)

### 2.2 Gráfico de ventas
- [ ] Gráfico de línea o barras (últimos 30 días)
- [ ] Estética: fondo transparente, línea en `#9933c1`, área rellena con `#9933c1/20`
- [ ] Ejes y grilla en `text-zinc-500`
- `TODO → tasks.md #DASH-02` Alimentar gráfico con datos reales de Supabase

### 2.3 Planes más vendidos
- [ ] Tabla o lista top 5 con badge de posición en `#b3ff6b`
- [ ] Columnas: Plan, País/Región, Unidades vendidas, Ingresos
- `TODO → tasks.md #DASH-03` Query agregada de órdenes por plan

### 2.4 Estado del sistema
- [ ] Sección de estado: YeSim API, Stripe, WhatsApp — con indicador de semáforo (verde/rojo)
- `TODO → tasks.md #DASH-04` Ping periódico a los servicios externos para health check

---

## Fase 3 — Gestión de Órdenes

**Objetivo:** Listado, detalle y gestión de reembolsos (RF-ADM-02).

### 3.1 Listado de órdenes
- [ ] Tabla con columnas: ID Orden, Cliente, Plan, País, Canal (web/mayorista/afiliado), Estado, Fecha, Monto
- [ ] Badges de estado con colores: Pendiente `text-yellow-400`, Completada `text-[#b3ff6b]`, Reembolsada `text-red-400`
- [ ] Filtros en barra lateral o row superior: Estado, Fecha (rango), País, Plan, Canal
- [ ] Buscador por ID o email del cliente
- [ ] Paginación con botones estilizados en violeta
- `TODO → tasks.md #ORD-01` Query paginada de órdenes con filtros dinámicos en Supabase

### 3.2 Detalle de orden
- [ ] Modal o página `/admin/orders/[id]`
- [ ] Muestra: datos del comprador, plan, fechas, método de pago, estado de entrega QR
- [ ] Botón "Reenviar QR" (email / WhatsApp)
- [ ] Botón "Iniciar Reembolso" (solo visible para Super Admin)
- `TODO → tasks.md #ORD-02` Integración con YeSim API para obtener estado del QR
- `TODO → tasks.md #ORD-03` Flujo de reembolso vía Stripe API (charge.refunded)
- `TODO → tasks.md #ORD-04` Reenvío de QR por email y WhatsApp desde el panel

---

## Fase 4 — Gestión de Planes

**Objetivo:** CRUD completo de planes (RF-ADM-04).

### 4.1 Listado de planes
- [ ] Tabla: Nombre, País/Región, Duración, Datos, Costo proveedor, Margen %, Precio final, Estado
- [ ] Toggle activo/inactivo directamente en la fila (switch estilizado en `#9933c1`)
- [ ] Badge "FUP" en `#b3ff6b` para planes ilimitados
- `TODO → tasks.md #PLAN-01` Fetch de planes desde Supabase (tabla local sincronizada con YeSim)

### 4.2 Formulario de plan
- [ ] Drawer o modal para crear/editar: campos ID YeSim, nombre visible, país, duración, datos, costo_proveedor, margen %, precio_fijo (opcional), estado
- [ ] Preview en tiempo real del precio_final calculado (costo × (1 + margen%))
- [ ] Checkbox "Precio fijo activo" que deshabilita el cálculo automático
- [ ] Validación de formulario con feedback visual en rojo/verde
- `TODO → tasks.md #PLAN-02` Guardar/actualizar plan en Supabase
- `TODO → tasks.md #PLAN-03` Sincronización con endpoint GET /plans de YeSim API

### 4.3 Historial de precios
- [ ] Sección colapsable por plan con tabla de cambios: timestamp, precio anterior, precio nuevo, razón
- `TODO → tasks.md #PLAN-04` Registrar cambios de precio en tabla price_history de Supabase

### 4.4 Alertas de cambio de precio
- [ ] Banner de alerta en el listado cuando hay variación ≥ 5% detectada (badge rojo parpadeante)
- [ ] Botón "Aplicar actualización automática" en violeta
- `TODO → tasks.md #PLAN-05` Cron job que compara precios YeSim vs precios almacenados y dispara notificación al admin

---

## Fase 5 — Gestión de Usuarios

**Objetivo:** Administración de cuentas de cliente (RF-ADM-03).

### 5.1 Listado de usuarios
- [ ] Tabla: Nombre, Email, Rol (Cliente/Afiliado/Agencia), Fecha de registro, Estado (Activo/Bloqueado), N.º de compras
- [ ] Filtros por rol y estado
- [ ] Buscador por nombre o email
- `TODO → tasks.md #USR-01` Query paginada de usuarios desde Supabase Auth + tabla profiles

### 5.2 Detalle de usuario
- [ ] Vista de historial de compras del usuario (últimas 10 órdenes)
- [ ] Datos de contacto y método de pago guardado (últimos 4 dígitos)
- [ ] Botones: Bloquear/Desbloquear cuenta, Cambiar rol
- `TODO → tasks.md #USR-02` Actualizar estado de cuenta vía Supabase Admin API
- `TODO → tasks.md #USR-03` Flujo de eliminación de cuenta y borrado de datos personales (RGPD)

---

## Fase 6 — Gestión de Cupones

**Objetivo:** CRUD de cupones y visualización de reportes (RF-ADM-05 + Módulo 8).

### 6.1 Listado de cupones
- [ ] Tabla: Código, Tipo (% / monto fijo), Descuento, Usos / Límite, Vencimiento, Estado
- [ ] Badge estado: Activo `#b3ff6b`, Vencido rojo, Pausado gris
- [ ] Botón de copiar código al portapapeles (micro-interacción)
- `TODO → tasks.md #CUP-01` Query de cupones desde Supabase con conteo de usos

### 6.2 Formulario de cupón
- [ ] Drawer/modal: Código, Tipo de descuento, Valor, Monto mínimo, Planes aplicables (multiselect), Fecha inicio/fin, Uso único (toggle), No acumulable (toggle), Límite global
- [ ] Generador de código aleatorio con botón "🔀 Generar"
- `TODO → tasks.md #CUP-02` Guardar cupón en Supabase con validaciones de unicidad

### 6.3 Reporte de cupón
- [ ] Al hacer clic en un cupón, panel expandido: usos totales, descuento total otorgado, ventas generadas
- `TODO → tasks.md #CUP-03` Queries agregadas de uso de cupones

---

## Fase 7 — Gestión de Afiliados

**Objetivo:** Aprobación, métricas y pagos de comisiones (RF-ADM-06 + Módulo 9).

### 7.1 Listado de afiliados
- [ ] Tabla: Nombre, Canal, Audiencia estimada, Estado (Pendiente/Activo/Suspendido), Ventas, Comisión pendiente, Comisión pagada
- [ ] Badges de estado en violeta/lima/rojo
- [ ] Filtro por estado
- `TODO → tasks.md #AFF-01` Query de afiliados desde Supabase con métricas agregadas

### 7.2 Detalle de afiliado
- [ ] Datos del formulario de solicitud
- [ ] Link de referido generado, código de cupón propio
- [ ] Historial de ventas referidas (tabla con órdenes)
- [ ] Botones: Aprobar / Suspender / Marcar comisión como pagada
- `TODO → tasks.md #AFF-02` Actualizar estado de afiliado en Supabase
- `TODO → tasks.md #AFF-03` Registrar pago externo de comisión con nota y timestamp

### 7.3 Estructura multinivel
- [ ] Indicador visual de jerarquía (Nivel 1 → Nivel 2) en detalle de afiliado
- `TODO → tasks.md #AFF-04` Lógica de comisiones por nivel (Nivel 1 y sub-afiliados Nivel 2)

---

## Fase 8 — Portal Mayorista (Admin View)

**Objetivo:** Gestión de cuentas de agencia y compras en lote (RF-ADM relacionados + Módulo 10).

### 8.1 Listado de agencias
- [ ] Tabla similar a afiliados: Nombre empresa, Email, Estado, Órdenes, Monto total
- [ ] Filtro por estado de aprobación
- `TODO → tasks.md #MAY-01` Query de usuarios con rol Agencia en Supabase

### 8.2 Detalle de agencia
- [ ] Historial de compras en lote
- [ ] Estado de cada eSIM del lote (sin asignar / asignada / activada)
- [ ] Configuración de margen mayorista específico para esa agencia
- `TODO → tasks.md #MAY-02` CRUD de precios mayoristas por agencia en Supabase
- `TODO → tasks.md #MAY-03` Generación de factura PDF descargable por orden mayorista

---

## Fase 9 — Soporte y Tickets

**Objetivo:** Panel de tickets para agentes humanos (RF-ADM-04 soporte + Módulo 11).

### 9.1 Listado de tickets
- [ ] Tabla: ID, Cliente, Canal (chat/email/WhatsApp), Estado, Prioridad, Agente asignado, Tiempo desde apertura
- [ ] Badges de prioridad: Alta en rojo, Media en amarillo, Baja en gris
- [ ] Filtros por estado, canal y agente
- `TODO → tasks.md #SUP-01` Integración con sistema de tickets (tabla en Supabase o servicio externo)

### 9.2 Detalle de ticket
- [ ] Timeline de la conversación (historial del bot + mensajes del cliente)
- [ ] Caja de respuesta del agente con envío vía email/WhatsApp
- [ ] Botones: Cerrar ticket, Cambiar prioridad, Asignar agente
- [ ] Sección de reembolso (solo Super Admin): botón "Aprobar Reembolso" que dispara flujo Stripe
- `TODO → tasks.md #SUP-02` Envío de respuesta del agente vía WhatsApp Business API y email
- `TODO → tasks.md #SUP-03` Flujo de aprobación de reembolso conectado a Stripe

### 9.3 Knowledge base y FAQs detectadas
- [ ] Listado de consultas sin respuesta capturadas por el bot, agrupadas por tema y frecuencia
- [ ] Badge "Sugerido" en `#b3ff6b` para consultas que superaron el umbral configurable (ej. 5)
- [ ] Botón "Agregar al KB" para convertir una consulta en FAQ
- `TODO → tasks.md #SUP-04` Tabla detected_faqs en Supabase alimentada por el bot (RF-SUP-07)
- `TODO → tasks.md #SUP-05` Umbral configurable desde panel de Configuración

---

## Fase 10 — Reportes y Finanzas

**Objetivo:** Informes exportables (Módulo 13). Solo visible para Super Admin.

### 10.1 Informe de ventas
- [ ] Filtros: período (rango de fechas), país destino, plan, canal
- [ ] Gráfico de barras por período en violeta
- [ ] Tabla resumen exportable
- `TODO → tasks.md #REP-01` Query agregada de ventas con filtros

### 10.2 Informe anual financiero
- [ ] Desglose mensual: ingresos, costo de ventas, margen bruto
- [ ] Botón exportar CSV y PDF
- `TODO → tasks.md #REP-02` Generación de PDF con datos financieros (para declaración fiscal LLC)

### 10.3 Informe de afiliados
- [ ] Comisiones devengadas por afiliado, ventas referidas, conversión por cupón
- `TODO → tasks.md #REP-03` Query de comisiones con join a órdenes

### 10.4 Informe de reembolsos
- [ ] Historial con motivo, monto y agente que lo gestionó
- `TODO → tasks.md #REP-04` Query filtrada de reembolsos desde Supabase

---

## Fase 11 — Configuración global

**Objetivo:** Panel de ajustes del sistema.

### 11.1 Configuración general
- [ ] Formulario con: nombre de la tienda, moneda, email de soporte, logo
- [ ] Toggle modo mantenimiento (banner en la landing)
- `TODO → tasks.md #CFG-01` Tabla settings en Supabase con key-value

### 11.2 Gestión de márgenes globales
- [ ] Margen default para nuevos planes
- [ ] Margen para mayoristas
- [ ] Margen para afiliados nivel 1 y nivel 2 (% de comisión)
- `TODO → tasks.md #CFG-02` Actualizar valores en tabla settings

### 11.3 Umbral de alertas
- [ ] Campo: % de variación de precio para activar alerta (default 5%)
- [ ] Campo: mínimo de retiro de comisiones de afiliado (default USD 50)
- [ ] Campo: umbral de FAQs detectadas (default 5)
- `TODO → tasks.md #CFG-03` Guardar umbrales en Supabase

### 11.4 Gestión de roles de admin
- [ ] Listado de cuentas admin con roles: Super Admin / Agente de Soporte
- [ ] Botones: Invitar admin, Cambiar rol, Revocar acceso
- `TODO → tasks.md #CFG-04` CRUD de roles admin vía Supabase Auth + tabla admin_roles

---

## Notas generales de implementación

- Todos los componentes deben seguir la guía de estética de QuieroSIM (colores, `QuieroButton`, radios, animaciones).
- La vista de escritorio es la prioritaria para el panel admin, pero debe ser responsiva.
- Las tablas deben soportar ordenamiento por columna.
- Las acciones destructivas (bloquear usuario, aprobar reembolso) deben requerir un modal de confirmación.
- Todas las acciones críticas deben quedar registradas en tabla audit_log con timestamp y user_id (RNF-08).