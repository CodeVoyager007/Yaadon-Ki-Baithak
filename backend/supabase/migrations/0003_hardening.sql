-- owns_family() is SECURITY DEFINER, and Postgres lets every role call new
-- functions by default, which would expose it to signed-out visitors through
-- the API. Only signed-in users need it (every policy runs as them).
revoke execute on function public.owns_family(uuid) from public, anon;
grant execute on function public.owns_family(uuid) to authenticated;

-- Share links must stay unguessable: families insert their own rows, so the
-- database, not the client, insists on a long random token.
alter table public.share_links
  add constraint share_links_token_strong check (token ~ '^[A-Za-z0-9]{24,64}$');
