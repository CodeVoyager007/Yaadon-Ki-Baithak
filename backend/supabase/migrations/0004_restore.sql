-- Everything a family book needs to come back on any device after sign-in
-- (and to print whole). The app still writes to a database without these
-- columns; it just leaves these fields on the device until this runs.

alter table public.families add column if not exists theme text;

-- A small resized photo of the storyteller (the app sends at most 400 KB).
alter table public.elders add column if not exists photo text
  check (photo is null or (photo like 'data:image/%' and length(photo) <= 400000));

alter table public.sessions add column if not exists ended_at timestamptz;

alter table public.chapters add column if not exists unclear text[] not null default '{}';
alter table public.chapters add column if not exists scene text;
alter table public.chapters add column if not exists draft boolean not null default false;
