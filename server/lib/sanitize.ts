import 'server-only';

/**
 * Saneo de texto de búsqueda ANTES de interpolarlo en un filtro PostgREST `.or()`.
 *
 * PostgREST parsea el string de `.or(...)` con caracteres significativos: `,`
 * separa condiciones, `()` agrupan, `*` es comodín de `like/ilike`, `:` y `\`
 * tienen rol propio. Si el input del usuario llega crudo, podría **alterar la
 * query** (inyección de filtro). Acá los reemplazamos por espacio, dejando solo
 * lo seguro para email/nombre. El `%` se quita para que no abuse del comodín.
 *
 * Regla del proyecto: input de usuario en `.or()` SIEMPRE pasa por acá. Cuando
 * se pueda, preferir el método parametrizado `.ilike('col', valor)`.
 */
export function sanitizePostgrestSearch(raw: string): string {
  return raw
    .replace(/[,()*:%\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}
