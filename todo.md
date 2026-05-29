# 📋 Plan de Tareas — Landing eSIM QuieroSIM

Este archivo sirve como registro oficial y auxiliar del avance sobre la landing page de venta de eSIM, optimizada para Stripe y bajo la marca **QuieroSIM**.

## Estado del Proyecto

- [x] **1. Configuración Inicial y Metadata**
  - [x] Crear estructura de directorios y archivo `todo.md`
  - [x] Actualizar `metadata.json` con el nombre de marca "QuieroSIM" e tagline "Internet para viajar"
- [x] **2. Archivos de Datos y Tipos (`/lib/`)**
  - [x] Crear `/lib/types.ts` con interfaces descriptivas para Destinos, Planes y Testimonios
  - [x] Crear `/lib/data/destinations.ts` con más de 20 destinos populares agrupados por región
  - [x] Crear `/lib/data/plans.ts` con datos de planes atractivos (GB, validez, precio en USD)
  - [x] Crear `/lib/data/testimonials.ts` con opiniones de clientes y calificaciones de 5 estrellas
- [x] **3. Páginas Legales Requeridas por Stripe**
  - [x] Desarrollar `/app/privacy-policy/page.tsx` (Política de Privacidad GDPR)
  - [x] Desarrollar `/app/terms-of-service/page.tsx` (Términos y condiciones con LLC legal)
  - [x] Desarrollar `/app/refund-policy/page.tsx` (Política de Reembolso clara para bienes digitales)
- [x] **4. Componentes del Layout (`/components/layout/`)**
  - [x] Crear e integrar `/components/layout/Navbar.tsx` (Rebrandeado a **QuieroSIM**, sticky, dark theme, con hover de enlaces y CTA lime)
  - [x] Crear e integrar `/components/layout/Footer.tsx` (Fondo negro, logo QuieroSIM, datos de Wyoming de QUIERO LLC, support email y links hover lime)
- [x] **5. Secciones de la Landing Page (`/components/sections/`)**
  - [x] `Hero.tsx`: Título con gradiente violeta/blanco, mockup móvil con halo y halo-shadow lime, tagline "Internet para viajar" y CTA de "Ver planes" / "Cómo funciona"
  - [x] `HowItWorks.tsx`: Estilo de diseño zig-zag premium con indicadores de pasos en números grandes lime, fondo blanco, y CTA "Conseguir mi eSIM"
  - [x] `Destinations.tsx`: Grid interactivo, buscador con focus en lime, filtros de región, tarjetas de planes populares con borde lime y cintillo "Más popular", y precio en USD
  - [x] `Pricing.tsx`: Integrado de forma reactiva en el módulo de destinos
  - [x] `Compatibility.tsx`: Buscador interactivo de dispositivos con focus lime, tabs de marcas estilo pills con borde gray/lime, caja de verificación universal y advertencia de bloqueo carrier con diseño opaco violeta (5%) y títulos negros
  - [x] `Testimonials.tsx`: Título de opiniones, estrellas de puntuación lime de alta fidelidad, avatar del usuario en color black con fondo lime/15, y tarjetas con sutil borde lime en hover
  - [x] `FAQ.tsx`: Acordeón interactivo con preguntas clave, flechas negras con fondo lime, borde gray(20%), y coloreado violeta con fondo opaco (2%) al abrir
- [x] **6. Flujo de Pago / Checkout de Stripe**
  - [x] Crear `/components/CheckoutModal.tsx` tematizado con el formulario seguro, cargadores de pago con pulsos de red lime y redirección hacia el código QR dinámico de simulación
- [x] **7. Integración y Animación (`/app/page.tsx`)**
  - [x] Ensamblar todas las secciones en `/app/page.tsx`
  - [x] Configurar metadata global y de página
  - [x] Agregar transiciones responsivas mediante Framer Motion / css animate
- [x] **8. Calidad, Lintellectual y Construcción (Verificado)**
  - [x] Ejecutar `lint_applet` para asegurar que cumple TypeScript estricto de forma impecable sin advertencias ni errores
  - [x] Compilar el proyecto con `compile_applet` para garantizar que está listo para producción y despliegue a Vercel/Cloud Run
