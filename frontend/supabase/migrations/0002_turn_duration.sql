-- How long each answer ran, in milliseconds, so a shared chapter can say
-- "3 min 20 s of voice" the way the family's own copy does.
alter table public.turns add column if not exists duration_ms int;

-- The foreign-key columns every list and share read filters on. Postgres
-- does not index FK columns on its own, and these turn into sequential
-- scans as chapters and turns grow.
create index if not exists elders_family_idx on public.elders (family_id);
create index if not exists sessions_elder_idx on public.sessions (elder_id);
create index if not exists turns_session_idx on public.turns (session_id);
create index if not exists chapters_session_idx on public.chapters (session_id);
create index if not exists share_links_family_idx on public.share_links (family_id);
