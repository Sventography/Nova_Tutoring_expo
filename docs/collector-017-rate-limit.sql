-- Applied to active Nova Supabase project on 2026-10-28.
-- Rate-limit code lookups and claims per verified Auth user, shared across workers.
-- Collector codes remain unissued; this migration does not create any.
create table if not exists collector_private.redemption_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  attempts integer not null default 1 check (attempts > 0),
  primary key (user_id, window_start)
);
alter table collector_private.redemption_attempts enable row level security;
revoke all on collector_private.redemption_attempts from public, anon, authenticated;

create or replace function collector_private.allow_redemption_attempt(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_attempts integer;
begin
  if p_user_id is null then return false; end if;
  insert into collector_private.redemption_attempts(user_id, window_start, attempts)
  values (p_user_id, date_trunc('hour', now()), 1)
  on conflict (user_id, window_start)
    do update set attempts = collector_private.redemption_attempts.attempts + 1
  returning attempts into v_attempts;
  return v_attempts <= 5;
end; $$;
revoke all on function collector_private.allow_redemption_attempt(uuid)
  from public, anon, authenticated;
grant execute on function collector_private.allow_redemption_attempt(uuid)
  to service_role;
