# /server — Capa server-side de Next.js (QuieroSIM)

**Regla de oro 1: el frontend solo importa de `server/actions` y `server/types`.**
Nunca importar `server/db` ni `server/services` desde componentes.

**Regla de oro 2 (decisión de arquitectura): acá NO viven secretos.**
Esta capa opera únicamente con la sesión del usuario (anon key + RLS): lecturas de
catálogo y paneles, y orquestación liviana. Todo lo que necesita un secreto de
terceros (Stripe, YeSim, Resend) o la `service_role` key corre en
**Supabase Edge Functions** (`/supabase/functions`), con secretos en
`supabase secrets`. Las Server Actions que disparan operaciones sensibles
(p. ej. crear checkout) invocan la Edge Function correspondiente; no la implementan.

| Carpeta | Responsabilidad |
|---|---|
| `actions/` | Server Actions — la fachada que consume el front. Devuelven siempre `Result<T>`. |
| `services/` | Lógica de presentación/lectura sin secretos (filtros de catálogo, derivación de estados para UI). |
| `db/` | Cliente Supabase server-side con sesión del usuario (RLS). Sin service_role. |
| `lib/` | Utilidades: errores, validación (Zod), logging con scrubbing, env. |
| `types/` | Tipos compartidos con el front (contratos de la fachada). |

Los clientes de YeSim/Stripe/Resend y la lógica de negocio sensible (provisión,
pricing de escritura, cupones, comisiones) viven en `/supabase/functions/_shared`
(Deno), testeados con mocks.
