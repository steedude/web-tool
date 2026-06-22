create table if not exists public.short_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_-]{3,24}$'),
  target_url text not null check (char_length(target_url) <= 2048),
  title text,
  clicks bigint not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.short_links enable row level security;
create policy "anyone can create short links" on public.short_links for insert to anon, authenticated with check (true);

create or replace function public.resolve_short_link(requested_slug text)
returns table (target_url text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.short_links set clicks = clicks + 1
  where slug = lower(requested_slug) and (expires_at is null or expires_at > now())
  returning short_links.target_url;
end;
$$;

revoke all on function public.resolve_short_link(text) from public;
grant execute on function public.resolve_short_link(text) to anon, authenticated;
grant insert on table public.short_links to anon, authenticated;
