# 📋 Planning — eSIM Landing Page

## Objetivo
Construir una landing page de eSIM turística (estilo HolaSim.com) con Next.js,
orientada a conseguir la aprobación del LLC en Stripe.
El sitio debe transmitir legitimidad, claridad del producto y modelo de negocio real.

---

## Stack

- **Framework:** Next.js 14+ con App Router
- **Estilos:** Tailwind CSS + shadcn/ui
- **Animaciones:** Framer Motion
- **Deploy:** Vercel
- **Dominio:** Custom `.com` con SSL

---

## Estructura de carpetas

```
/
├── app/
│   ├── layout.tsx           # Root layout + metadata global
│   ├── page.tsx             # Landing principal (todas las secciones)
│   ├── privacy-policy/
│   │   └── page.tsx
│   ├── terms-of-service/
│   │   └── page.tsx
│   └── refund-policy/
│       └── page.tsx
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── Destinations.tsx
│   │   ├── Pricing.tsx
│   │   ├── Compatibility.tsx
│   │   ├── Testimonials.tsx
│   │   └── FAQ.tsx
│   └── ui/                  # shadcn components
├── lib/
│   ├── data/
│   │   ├── plans.ts         # Planes y precios
│   │   ├── destinations.ts  # Lista de países
│   │   └── testimonials.ts  # Reviews
│   └── utils.ts
├── public/
│   ├── og-image.png         # Open Graph 1200x630
│   └── ...
├── planning.md              # Este archivo
└── tailwind.config.ts
```

---

## Secciones de la Landing (en orden)

### 1. Navbar
- Logo + links de navegación + botón CTA "Comprar eSIM"
- Sticky en scroll
- Mobile: hamburger menu

### 2. Hero
- Headline: "Conectate al instante en más de X países"
- Subheadline: propuesta de valor en 1–2 líneas
- CTA primario: "Ver planes" → scroll a #pricing
- CTA secundario: "¿Cómo funciona?" → scroll a #how
- Visual: imagen de teléfono mostrando la app / mapa animado

### 3. Cómo funciona
- 3 pasos con iconos:
  1. Elegís tu destino y plan
  2. Pagás de forma segura
  3. Activás la eSIM al llegar

### 4. Destinos / Cobertura
- Grid de tarjetas de países (bandera + nombre + "Ver planes")
- Filtro por región (Europa, Asia, América, etc.)
- Mínimo 20–30 destinos para credibilidad

### 5. Planes y Precios  ⚠️ CRÍTICO PARA STRIPE
- Tabs por destino o región
- Cards con: GBs incluidos, validez en días, precio en USD, botón "Comprar"
- Badge "Más popular" en plan intermedio
- Texto: "Pago único · Sin suscripción · Activación inmediata"

### 6. Compatibilidad
- "¿Mi teléfono es compatible?"
- Lista de dispositivos: iPhone 13+, iPhone XS+, Samsung S21+, Pixel 3+...
- Herramienta de búsqueda simple

### 7. Testimonios
- 6–8 cards con: foto avatar, nombre, país de origen, destino, rating ⭐, texto
- Layout: grid 3 columnas o carrusel en mobile

### 8. FAQ
- Accordion con 8–10 preguntas:
  - "¿Qué es una eSIM?"
  - "¿Cuándo se activa?"
  - "¿Puedo usarla en varios viajes?"
  - "¿Qué pasa si me quedo sin datos?"
  - "¿Cómo instalo la eSIM?"
  - "¿Tienen soporte en español?"

### 9. Footer  ⚠️ CRÍTICO PARA STRIPE
- Nombre legal de la LLC
- Dirección registrada
- Email de soporte: support@[dominio].com
- Links: Privacy Policy | Terms of Service | Refund Policy
- Redes sociales (Instagram, Twitter/X)
- Copyright © 2024 [Nombre LLC]. All rights reserved.

---

## Páginas legales (requeridas por Stripe)

- `/privacy-policy` — Política de privacidad completa (GDPR-aware)
- `/terms-of-service` — Términos y condiciones
- `/refund-policy` — Política de reembolso (puede ir dentro de ToS)

---

## Checklist pre-Stripe

- [ ] Sitio live en dominio propio con SSL
- [ ] Descripción clara del producto/servicio
- [ ] Precios en USD visibles
- [ ] Datos de contacto de la LLC en footer
- [ ] Privacy Policy accesible
- [ ] Terms of Service accesible
- [ ] Refund Policy accesible
- [ ] Flujo de compra claro (CTA → checkout)
- [ ] No contenido prohibido por Stripe
- [ ] Email de soporte funcional
- [ ] Meta tags y OG image configurados

---

## Notas de desarrollo

- Usar `next/image` para todas las imágenes (performance)
- Configurar metadata con `generateMetadata` en cada página
- Variables de entorno en `.env.local` (nunca commitear)
- Componentes del servidor por defecto, `'use client'` solo donde hay interactividad
- Tipografías via `next/font` (no CDN externo)
