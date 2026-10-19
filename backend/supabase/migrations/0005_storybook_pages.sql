-- A chapter is an illustrated storybook: each page's Urdu and English text, the
-- line numbers it came from, its scene, and the storage path of its painting
-- (inside the family's own images/ folder). The app still saves chapters to a
-- database without this column; the pages then live on the device only.
alter table public.chapters add column if not exists pages jsonb not null default '[]'::jsonb;
