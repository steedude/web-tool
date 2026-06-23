-- Web Lab Supabase setup
-- Copy this whole file into Supabase SQL Editor and run it once.
-- It is safe to run again: tables, columns, policies, and functions are created or replaced idempotently.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.short_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_-]{3,24}$'),
  target_url text not null check (char_length(target_url) <= 2048),
  title text,
  description text,
  image_url text check (image_url is null or char_length(image_url) <= 2048),
  screenshot_url text check (screenshot_url is null or char_length(screenshot_url) <= 2048),
  favicon_url text check (favicon_url is null or char_length(favicon_url) <= 2048),
  password_hash text,
  clicks bigint not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.short_links
  add column if not exists description text,
  add column if not exists image_url text check (image_url is null or char_length(image_url) <= 2048),
  add column if not exists screenshot_url text check (screenshot_url is null or char_length(screenshot_url) <= 2048),
  add column if not exists favicon_url text check (favicon_url is null or char_length(favicon_url) <= 2048),
  add column if not exists password_hash text;

alter table public.short_links enable row level security;

create table if not exists public.image_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_-]{3,24}$'),
  image_url text not null check (char_length(image_url) <= 2048),
  title text,
  description text,
  password_hash text,
  clicks bigint not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.image_links enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'short_links'
      and policyname = 'anyone can create short links'
  ) then
    create policy "anyone can create short links"
      on public.short_links
      for insert
      to anon, authenticated
      with check (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'image_links'
      and policyname = 'anyone can create image links'
  ) then
    create policy "anyone can create image links"
      on public.image_links
      for insert
      to anon, authenticated
      with check (true);
  end if;
end;
$$;

drop function if exists public.resolve_short_link(text);

create or replace function public.create_short_link(
  link_description text,
  link_expires_at timestamptz,
  link_favicon_url text,
  link_image_url text,
  link_password text,
  link_screenshot_url text,
  link_slug text,
  link_target_url text,
  link_title text
)
returns table (
  description text,
  expires_at timestamptz,
  favicon_url text,
  image_url text,
  password text,
  screenshot_url text,
  slug text,
  target_url text,
  title text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.short_links (
    description,
    expires_at,
    favicon_url,
    image_url,
    password_hash,
    screenshot_url,
    slug,
    target_url,
    title
  )
  values (
    create_short_link.link_description,
    create_short_link.link_expires_at,
    create_short_link.link_favicon_url,
    create_short_link.link_image_url,
    case
      when nullif(create_short_link.link_password, '') is null then null
      else extensions.crypt(create_short_link.link_password, extensions.gen_salt('bf'))
    end,
    create_short_link.link_screenshot_url,
    lower(create_short_link.link_slug),
    create_short_link.link_target_url,
    create_short_link.link_title
  );

  return query
  select
    create_short_link.link_description,
    create_short_link.link_expires_at,
    create_short_link.link_favicon_url,
    create_short_link.link_image_url,
    null::text as password,
    create_short_link.link_screenshot_url,
    lower(create_short_link.link_slug),
    create_short_link.link_target_url,
    create_short_link.link_title;
end;
$$;

create or replace function public.resolve_short_link(requested_slug text, password_attempt text default null)
returns table (
  password_required boolean,
  status text,
  target_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_link public.short_links%rowtype;
begin
  select *
  into matched_link
  from public.short_links
  where slug = lower(requested_slug);

  if matched_link.id is null then
    return query select false, 'not_found'::text, null::text;
    return;
  end if;

  if matched_link.expires_at is not null and matched_link.expires_at <= now() then
    return query select false, 'expired'::text, null::text;
    return;
  end if;

  if matched_link.password_hash is not null
    and (password_attempt is null or matched_link.password_hash <> extensions.crypt(password_attempt, matched_link.password_hash)) then
    return query select true, 'password_required'::text, null::text;
    return;
  end if;

  update public.short_links
  set clicks = clicks + 1
  where id = matched_link.id;

  return query select matched_link.password_hash is not null, 'resolved'::text, matched_link.target_url;
end;
$$;

create or replace function public.create_image_link(
  link_description text,
  link_expires_at timestamptz,
  link_image_url text,
  link_password text,
  link_slug text,
  link_title text
)
returns table (
  description text,
  expires_at timestamptz,
  image_url text,
  password text,
  slug text,
  title text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.image_links (
    description,
    expires_at,
    image_url,
    password_hash,
    slug,
    title
  )
  values (
    create_image_link.link_description,
    create_image_link.link_expires_at,
    create_image_link.link_image_url,
    case
      when nullif(create_image_link.link_password, '') is null then null
      else extensions.crypt(create_image_link.link_password, extensions.gen_salt('bf'))
    end,
    lower(create_image_link.link_slug),
    create_image_link.link_title
  );

  return query
  select
    create_image_link.link_description,
    create_image_link.link_expires_at,
    create_image_link.link_image_url,
    null::text as password,
    lower(create_image_link.link_slug),
    create_image_link.link_title;
end;
$$;

create or replace function public.resolve_image_link(requested_slug text, password_attempt text default null)
returns table (
  description text,
  image_url text,
  password_required boolean,
  status text,
  title text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_link public.image_links%rowtype;
begin
  select *
  into matched_link
  from public.image_links
  where slug = lower(requested_slug);

  if matched_link.id is null then
    return query select null::text, null::text, false, 'not_found'::text, null::text;
    return;
  end if;

  if matched_link.expires_at is not null and matched_link.expires_at <= now() then
    return query select null::text, null::text, false, 'expired'::text, null::text;
    return;
  end if;

  if matched_link.password_hash is not null
    and (password_attempt is null or matched_link.password_hash <> extensions.crypt(password_attempt, matched_link.password_hash)) then
    return query select matched_link.description, null::text, true, 'password_required'::text, matched_link.title;
    return;
  end if;

  update public.image_links
  set clicks = clicks + 1
  where id = matched_link.id;

  return query select matched_link.description, matched_link.image_url, matched_link.password_hash is not null, 'resolved'::text, matched_link.title;
end;
$$;

revoke all on function public.create_short_link(text, timestamptz, text, text, text, text, text, text, text) from public;
grant execute on function public.create_short_link(text, timestamptz, text, text, text, text, text, text, text) to anon, authenticated;

revoke all on function public.resolve_short_link(text, text) from public;
grant execute on function public.resolve_short_link(text, text) to anon, authenticated;

revoke all on function public.create_image_link(text, timestamptz, text, text, text, text) from public;
grant execute on function public.create_image_link(text, timestamptz, text, text, text, text) to anon, authenticated;

revoke all on function public.resolve_image_link(text, text) from public;
grant execute on function public.resolve_image_link(text, text) to anon, authenticated;

grant insert on table public.short_links to anon, authenticated;
grant insert on table public.image_links to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'link-images',
  'link-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'anyone can upload link images'
  ) then
    create policy "anyone can upload link images"
      on storage.objects
      for insert
      to anon, authenticated
      with check (bucket_id = 'link-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'anyone can view link images'
  ) then
    create policy "anyone can view link images"
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'link-images');
  end if;
end;
$$;
