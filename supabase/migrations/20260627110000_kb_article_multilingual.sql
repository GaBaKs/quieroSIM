-- Soporte: artículos de KB en 3 idiomas (ES base en title/content; EN/PT nuevas).
alter table public.kb_article
  add column if not exists title_en text,
  add column if not exists content_en text,
  add column if not exists title_pt text,
  add column if not exists content_pt text;

-- tsvector multilingüe: indexa los 3 idiomas juntos (config 'simple' + unaccent).
create or replace function public.kb_tsv_ml(
  p_title text, p_content text,
  p_title_en text, p_content_en text,
  p_title_pt text, p_content_pt text
) returns tsvector language sql immutable parallel safe as $$
  select
    setweight(to_tsvector('simple', unaccent('unaccent',
      coalesce(p_title,'') || ' ' || coalesce(p_title_en,'') || ' ' || coalesce(p_title_pt,''))), 'A') ||
    setweight(to_tsvector('simple', unaccent('unaccent',
      coalesce(p_content,'') || ' ' || coalesce(p_content_en,'') || ' ' || coalesce(p_content_pt,''))), 'B')
$$;

-- Recrear la columna generada incluyendo EN/PT.
drop index if exists kb_article_tsv_gin;
alter table public.kb_article drop column if exists search_tsv;
alter table public.kb_article
  add column search_tsv tsvector
  generated always as (public.kb_tsv_ml(title, content, title_en, content_en, title_pt, content_pt)) stored;
create index kb_article_tsv_gin on public.kb_article using gin (search_tsv);

-- search_kb ahora recibe idioma y devuelve título/contenido en ese idioma (fallback ES).
drop function if exists public.search_kb(text, int);
create or replace function public.search_kb(p_query text, p_limit int default 5, p_lang text default 'es')
returns table (id uuid, title text, content text, category text, rank real)
language sql stable security invoker
set search_path = public as $$
  with q as (
    select websearch_to_tsquery('simple', unaccent('unaccent', coalesce(p_query, ''))) as tsq,
           coalesce(p_query, '') as raw,
           lower(coalesce(p_lang, 'es')) as lang
  )
  select a.id,
    case q.lang when 'en' then coalesce(nullif(a.title_en, ''), a.title)
                when 'pt' then coalesce(nullif(a.title_pt, ''), a.title)
                else a.title end as title,
    case q.lang when 'en' then coalesce(nullif(a.content_en, ''), a.content)
                when 'pt' then coalesce(nullif(a.content_pt, ''), a.content)
                else a.content end as content,
    a.category,
    (ts_rank(a.search_tsv, q.tsq) + 0.3 * similarity(a.title, q.raw))::real as rank
  from kb_article a, q
  where a.search_tsv @@ q.tsq or a.title % q.raw
  order by rank desc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
$$;
revoke all on function public.search_kb(text, int, text) from public;
grant execute on function public.search_kb(text, int, text) to anon, authenticated;
