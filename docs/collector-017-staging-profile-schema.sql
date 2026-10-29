-- ONLY for an empty, isolated Supabase staging project.
-- Applied to nova-collector-staging on 2026-10-29 as two Supabase migrations:
--   staging_profiles_owner_only_and_signup_check
--   fix_staging_check_username_coalesce
-- This consolidated, corrected reference file intentionally contains NO
-- production data, user seeds, physical serials, or privileged credentials.
-- DO NOT run as an alteration of Nova's live profiles table.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  contact_email text,
  avatar_url text,
  coins bigint default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  purchases jsonb not null default '{}'::jsonb,
  daily_streak_current integer default 0,
  daily_streak_best integer default 0,
  daily_streak_last_utc text,
  ask_memory_limit integer default 5,
  ask_memory_tier text default 'free',
  ask_personality text default 'encouraging',
  avatar_key text,
  equipped_companion_id text,
  companion_shield_last_used_at timestamptz,
  companion_shield_charges integer not null default 1,
  companion_hint_tokens integer not null default 0,
  companion_hint_last_grant_at timestamptz,
  island_level integer not null default 1,
  island_xp bigint not null default 0,
  username_changed_at timestamptz
);

create unique index if not exists staging_profiles_username_unique_ci
on public.profiles (lower(btrim(username)))
where username is not null and btrim(username) <> '';

alter table public.profiles enable row level security;

revoke all on public.profiles from public, anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

-- Keep staged user profiles private, even to other signed-in accounts.
create policy staging_profiles_select_own
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy staging_profiles_insert_own
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

create policy staging_profiles_update_own
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy staging_profiles_delete_own
on public.profiles for delete to authenticated
using ((select auth.uid()) = id);

-- The existing Expo sign-up screen calls check_username as an anonymous RPC.
-- SECURITY DEFINER is an intentional, narrowly bounded exception here:
-- its only possible output is an availability status, never profile rows.
-- Do not extend this function to return identifying account information,
-- and keep its search_path empty. Supabase's advisor flags this exception.
create or replace function public.check_username(desired_username text)
returns text language plpgsql stable security definer set search_path = ''
as $$
declare
  candidate text := pg_catalog.btrim(coalesce(desired_username, ''));
  viewer uuid := auth.uid();
begin
  if candidate = '' then return 'empty'; end if;
  if pg_catalog.char_length(candidate) < 3 then return 'too_short'; end if;
  if pg_catalog.char_length(candidate) > 8 then return 'too_long'; end if;
  if candidate !~ '^[A-Za-z0-9_]+$' then return 'invalid_chars'; end if;
  if viewer is not null and exists (
    select 1 from public.profiles p
    where p.id = viewer
    and pg_catalog.lower(pg_catalog.btrim(p.username)) = pg_catalog.lower(candidate)
  ) then return 'same'; end if;
  if exists (
    select 1 from public.profiles p
    where pg_catalog.lower(pg_catalog.btrim(p.username)) = pg_catalog.lower(candidate)
  ) then return 'taken'; end if;
  return 'ok';
end;
$$;

revoke all on function public.check_username(text) from public, anon, authenticated;
grant execute on function public.check_username(text) to anon, authenticated;
