-- Yaadon ki Baithak: first schema.
-- Every table is private to the family's owner. Share links expose read-only chapters.

create table public.families (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.elders (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  relation text not null,
  language text not null default 'Urdu',
  birthplace text,
  birth_year text,
  consent_given_at timestamptz,           -- when the elder agreed to be recorded
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references public.elders (id) on delete cascade,
  theme text not null,
  status text not null default 'open' check (status in ('open', 'writing', 'done')),
  created_at timestamptz not null default now()
);

create table public.turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  idx int not null,
  role text not null check (role in ('elder', 'birdy')),
  text text not null,
  lang text not null default 'ur',
  audio_path text,                        -- path in the private "audio" bucket
  created_at timestamptz not null default now(),
  unique (session_id, idx)
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  title_ur text not null,
  title_en text not null,
  body_ur text not null,
  body_en text not null,
  source_turns int[] not null default '{}',
  pull_quote text,
  pull_quote_turn int,
  year text,
  place text,
  image_path text,                        -- path in the private "images" bucket
  created_at timestamptz not null default now()
);

create table public.share_links (
  -- 32 hex chars from built-in functions only: no pgcrypto dependency, so
  -- the migration runs on any fresh Postgres without enabling extensions.
  token text primary key default md5(gen_random_uuid()::text || gen_random_uuid()::text),
  family_id uuid not null references public.families (id) on delete cascade,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

-- Helper: does the signed-in user own this family?
create or replace function public.owns_family(fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from families where id = fid and owner_id = auth.uid());
$$;

alter table public.families enable row level security;
alter table public.elders enable row level security;
alter table public.sessions enable row level security;
alter table public.turns enable row level security;
alter table public.chapters enable row level security;
alter table public.share_links enable row level security;

create policy "own families" on public.families
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own elders" on public.elders
  for all using (public.owns_family(family_id)) with check (public.owns_family(family_id));

create policy "own sessions" on public.sessions
  for all using (public.owns_family((select family_id from public.elders e where e.id = elder_id)))
  with check (public.owns_family((select family_id from public.elders e where e.id = elder_id)));

create policy "own turns" on public.turns
  for all using (public.owns_family((
    select e.family_id from public.sessions s join public.elders e on e.id = s.elder_id where s.id = session_id)))
  with check (public.owns_family((
    select e.family_id from public.sessions s join public.elders e on e.id = s.elder_id where s.id = session_id)));

create policy "own chapters" on public.chapters
  for all using (public.owns_family((
    select e.family_id from public.sessions s join public.elders e on e.id = s.elder_id where s.id = session_id)))
  with check (public.owns_family((
    select e.family_id from public.sessions s join public.elders e on e.id = s.elder_id where s.id = session_id)));

create policy "own share links" on public.share_links
  for all using (public.owns_family(family_id)) with check (public.owns_family(family_id));
-- Public share pages read through a server route with the service role key,
-- after checking the token is not revoked or expired. No anon policies on purpose.

-- Private storage buckets. Files are served with short-lived signed URLs.
insert into storage.buckets (id, name, public) values ('audio', 'audio', false), ('images', 'images', false)
on conflict (id) do nothing;

-- Files live under {family_id}/... so the first folder decides ownership.
create policy "own audio and images" on storage.objects
  for all using (
    bucket_id in ('audio', 'images') and public.owns_family(((storage.foldername(name))[1])::uuid)
  ) with check (
    bucket_id in ('audio', 'images') and public.owns_family(((storage.foldername(name))[1])::uuid)
  );
