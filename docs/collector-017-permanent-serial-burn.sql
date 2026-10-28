-- Applied 2026-10-28: claimed serials stay permanently spent after Auth deletion.
-- The Auth FK sets claimed_by=NULL; claimed_at remains the irreversible marker.
alter table collector_private.plushie_codes drop constraint if exists claimed_together;
alter table collector_private.plushie_codes
  add constraint claimed_together
  check (claimed_by is null or claimed_at is not null);

create or replace function collector_private.claim_castle_017(
  p_user_id uuid, p_code_hash text
) returns text
language plpgsql security definer set search_path = ''
as $$
declare v_code collector_private.plushie_codes%rowtype;
begin
  if p_user_id is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    return 'invalid';
  end if;
  select * into v_code from collector_private.plushie_codes
    where code_hash = p_code_hash for update;
  if not found or v_code.serial_number <> 17 then
    return 'invalid';
  end if;
  if v_code.claimed_at is not null then
    if v_code.claimed_by = p_user_id then return 'already_yours'; end if;
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
exception when unique_violation then return 'already_owned';
end; $$;
revoke all on function collector_private.claim_castle_017(uuid,text)
  from public, anon, authenticated;
grant execute on function collector_private.claim_castle_017(uuid,text)
  to service_role;
