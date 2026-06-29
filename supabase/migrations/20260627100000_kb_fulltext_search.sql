-- Soporte S1: búsqueda full-text de la base de conocimiento, SIN LLM.
-- Config 'simple' + unaccent → matching multilingüe (ES/EN/PT) sin stemming sesgado.
-- La columna kb_article.embedding queda RESERVADA para el LLM futuro (no se toca).
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- Wrapper IMMUTABLE para poder usarlo en una columna generada.
-- unaccent de 2 args (con dictionary) SÍ es immutable.
create or replace function public.kb_tsv(p_title text, p_content text)
returns tsvector language sql immutable parallel safe as $$
  select setweight(to_tsvector('simple', unaccent('unaccent', coalesce(p_title, ''))), 'A') ||
         setweight(to_tsvector('simple', unaccent('unaccent', coalesce(p_content, ''))), 'B')
$$;

alter table public.kb_article
  add column if not exists search_tsv tsvector
  generated always as (public.kb_tsv(title, content)) stored;

create index if not exists kb_article_tsv_gin on public.kb_article using gin (search_tsv);
create index if not exists kb_article_title_trgm on public.kb_article using gin (title gin_trgm_ops);

-- Búsqueda rankeada. SECURITY INVOKER → respeta la RLS pública de kb_article (kb_sel using(true)).
-- Primario: tsvector @@ tsquery (GIN). Fallback: trigram en title para typos.
create or replace function public.search_kb(p_query text, p_limit int default 5)
returns table (id uuid, title text, content text, category text, rank real)
language sql stable security invoker
set search_path = public as $$
  with q as (
    select websearch_to_tsquery('simple', unaccent('unaccent', coalesce(p_query, ''))) as tsq,
           coalesce(p_query, '') as raw
  )
  select a.id, a.title, a.content, a.category,
         (ts_rank(a.search_tsv, q.tsq) + 0.3 * similarity(a.title, q.raw))::real as rank
  from kb_article a, q
  where a.search_tsv @@ q.tsq
     or a.title % q.raw
  order by rank desc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
$$;
revoke all on function public.search_kb(text, int) from public;
grant execute on function public.search_kb(text, int) to anon, authenticated;

-- Registro de consultas sin respuesta (RF-SUP-07). Upsert manual por texto normalizado
-- (unresolved_query no tiene unique(query_text); agregarlo = coordinar con diseñador BD).
create or replace function public.support_log_unresolved(p_query text, p_category text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_norm text := btrim(left(coalesce(p_query, ''), 500));
begin
  if v_norm = '' then return; end if;
  update unresolved_query
     set frequency = frequency + 1, last_seen_at = now()
   where lower(query_text) = lower(v_norm);
  if not found then
    insert into unresolved_query (query_text, category, frequency, last_seen_at)
    values (v_norm, p_category, 1, now());
  end if;
end; $$;
revoke all on function public.support_log_unresolved(text, text) from public;
grant execute on function public.support_log_unresolved(text, text) to authenticated;
