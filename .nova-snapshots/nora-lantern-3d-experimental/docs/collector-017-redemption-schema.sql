-- Collector QR redemption foundation (review before applying to production).
-- Codes are generated offline, printed only inside shipped plushies, and stored as SHA-256 hashes.
-- Never embed a code, its hash, or service-role credentials in the mobile app.
-- The authenticated backend must verify the Supabase access token before calling the private function.

create schema if not exists collector_private;
revoke all on schema collector_private from public, anon, authenticated;

create table if not exists collector_private.plushie_codes (
  id uuid primary key default gen_random_uuid(),
  edition text not null check (edition = 'noras_last_lantern'),
  serial_number integer not null check (serial_number between 1 and 100),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null default now(),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  constraint serial_unique unique (edition, serial_number),
  constraint claimed_together check ((claimed_by is null) = (claimed_at is null))
);
create unique index if not exists one_castle_per_account
  on collector_private.plushie_codes (claimed_by)
  where claimed_by is not null and serial_number = 17;
alter table collector_private.plushie_codes enable row level security;
revoke all on collector_private.plushie_codes from public, anon, authenticated;

-- Separate, backend-only entitlements: local inventory cannot authorize rewards.
create table if not exists collector_private.reward_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id text not null check (reward_id = 'noras_last_lantern_017'),
  code_id uuid not null unique references collector_private.plushie_codes(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, reward_id)
);
alter table collector_private.reward_entitlements enable row level security;
revoke all on collector_private.reward_entitlements from public, anon, authenticated;

-- Call from trusted backend only, using service credentials and a VERIFIED user ID.
-- No execute grant to anon/authenticated. This function is in an unexposed schema.
create or replace function collector_private.claim_castle_017(
  p_user_id uuid, p_code_hash text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code collector_private.plushie_codes%rowtype;
begin
  if p_user_id is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    return 'invalid';
  end if;
  select * into v_code from collector_private.plushie_codes
    where code_hash = p_code_hash for update;
  if not found or v_code.serial_number <> 17 then
    return 'invalid';
  end if;
  if v_code.claimed_by = p_user_id then
    return 'already_yours';
  end if;
  if v_code.claimed_by is not null then
    return 'already_claimed';
  end if;
  if exists (
    select 1 from collector_private.reward_entitlements
    where user_id = p_user_id and reward_id = 'noras_last_lantern_017'
  ) then
    return 'already_owned';
  end if;
  update collector_private.plushie_codes
    set claimed_by = p_user_id, claimed_at = now()
    where id = v_code.id;
  insert into collector_private.reward_entitlements(user_id, reward_id, code_id)
    values (p_user_id, 'noras_last_lantern_017', v_code.id);
  return 'claimed';
exception
  when unique_violation then
    return 'already_owned';
end;
$$;
revoke all on function collector_private.claim_castle_017(uuid,text)
  from public, anon, authenticated;
grant usage on schema collector_private to service_role;
grant execute on function collector_private.claim_castle_017(uuid,text) to service_role;

-- Important: do not create a public client-callable grant/claim RPC.
-- The backend should hash the supplied random code, invoke this function in
-- a transaction, and read reward_entitlements for cross-device ownership.
-- A separate server endpoint must also enforce rate limits and abuse controls.
