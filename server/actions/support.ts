'use server';

import { z } from 'zod';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';

/**
 * Fachada de Soporte (lado usuario). v1 SIN LLM: búsqueda full-text de la base de
 * conocimiento (RPC search_kb) + asistente guiado (S2). El front solo conoce
 * estas actions. La columna kb_article.embedding queda reservada para el LLM futuro.
 */

export interface KbArticle {
  id: string;
  title: string;
  content: string;
  category: string | null;
}

const searchSchema = z.object({ query: z.string().trim().min(2).max(200) });

/** Busca artículos de ayuda por texto (tolerante a tildes y typos). Pública (apta guests). */
export async function searchKb(input: { query: string }): Promise<Result<KbArticle[]>> {
  const parsed = parseInput(searchSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('search_kb' as never, {
    p_query: parsed.data.query,
    p_limit: 5,
  } as never);
  if (error) {
    logger.error('searchKb falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos buscar en la ayuda. Intentá de nuevo.');
  }

  const rows = (data ?? []) as Array<{ id: string; title: string; content: string; category: string | null }>;

  // Sin resultados → registramos la consulta para detectar FAQs faltantes (RF-SUP-07).
  // La RPC es 'authenticated'; los guests no la disparan (no pasa nada si falla).
  if (rows.length === 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.rpc('support_log_unresolved' as never, { p_query: parsed.data.query, p_category: null } as never);
    }
  }

  return ok(rows.map((r) => ({ id: r.id, title: r.title, content: r.content, category: r.category })));
}
