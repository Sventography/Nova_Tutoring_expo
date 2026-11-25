begin;

-- Only the trusted server can issue and evaluate a challenge. No raw answers or journal text are retained.
create table public.nova_archive_verification (
  user_id uuid primary key references auth.users(id) on delete cascade,
  question_order integer[] not null,
  step integer not null default 1 check (step between 1 and 5),
  challenge uuid not null default gen_random_uuid(),
  failures integer not null default 0 check (failures >= 0),
  blocked_until timestamptz,
  verified_at timestamptz
);
alter table public.nova_archive_verification enable row level security;
revoke all on public.nova_archive_verification from public, anon, authenticated, service_role;
grant select on public.nova_archive_verification to service_role;

-- This verifies knowledge of the story; it cannot prove how a human obtained it.
-- Fixed question IDs and answers never come from the browser. Only the current
-- prompt and an account-bound, rotating challenge ID are returned.
create function public.nova_verify_archive(p_user_id uuid, p_challenge uuid default null, p_answer text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v public.nova_archive_verification%rowtype;
  q integer;
  normalized text;
  correct boolean;
  prompt text;
  outcome text := 'question';
begin
  if p_user_id is null then raise exception 'Account required'; end if;
  if p_answer is not null and (length(p_answer) > 512 or p_challenge is null) then
    return jsonb_build_object('status','invalid');
  end if;
  -- A row lock serializes answers, including concurrent/replayed requests.
  insert into public.nova_archive_verification(user_id, question_order)
    select p_user_id, array_agg(n order by random()) from generate_series(1,4) n
    on conflict (user_id) do nothing;
  select * into strict v from public.nova_archive_verification where user_id = p_user_id for update;
  if v.verified_at is not null then return jsonb_build_object('status','verified'); end if;
  if v.blocked_until is not null and v.blocked_until > now() then
    return jsonb_build_object('status','wait','retry_after', greatest(1,ceil(extract(epoch from v.blocked_until-now()))::integer));
  end if;
  if v.blocked_until is not null then
    update public.nova_archive_verification set failures=0,blocked_until=null where user_id=p_user_id returning * into v;
  end if;
  q := v.question_order[v.step];
  if p_answer is not null then
    if p_challenge <> v.challenge then
      outcome := 'stale';
    else
      normalized := trim(regexp_replace(lower(p_answer), '[^a-z0-9]+', ' ', 'g'));
      -- Natural short answers, no case/punctuation sensitivity. Conservative
      -- matching: explicitly teach players they can answer in a few words.
      correct := case q
        when 1 then normalized ~ '^(sixteen|16)( stars?)?$'
        when 2 then normalized ~ '^(the )?(rabbit|bunny|white rabbit|white bunny|bunny plushie|rabbit plushie|white rabbit plushie|white bunny plushie)( s? ear)?$'
        when 3 then normalized ~ '^(first draft|the first draft|first answer|the first answer|wrong answer|the wrong answer|original answer|the original answer|crossed out answer|the crossed out answer)$'
        when 4 then normalized ~ '^(nora|nora vale|nora s|noras|nora vale s|nora vales)( memories| experiences| life)?$'
        else false end;
      if correct then
        update public.nova_archive_verification
          set step=step+1,challenge=gen_random_uuid(),failures=0,
              verified_at=case when step=4 then now() else null end
          where user_id=p_user_id returning * into v;
        if v.verified_at is not null then return jsonb_build_object('status','verified'); end if;
      else
        update public.nova_archive_verification
          set failures=failures+1,challenge=gen_random_uuid(),
              blocked_until=case when failures+1>=5 then now()+interval '15 minutes' else null end
          where user_id=p_user_id returning * into v;
        if v.blocked_until is not null then return jsonb_build_object('status','wait','retry_after',900); end if;
        outcome := 'incorrect';
      end if;
    end if;
  end if;
  prompt := case v.question_order[v.step]
    when 1 then 'Before Nora added a pencil mark, how many stars were printed on the original chart?'
    when 2 then 'What keepsake contained a repaired ear and a hidden knot?'
    when 3 then 'What did QUIET try to remove when it kept the corrected answer?'
    when 4 then 'Whose lived memories did Nova mistake for her own?'
    else null end;
  return jsonb_build_object('status',outcome,'challenge',v.challenge,'question',prompt,'step',v.step,'total',4);
end;
$$;
revoke execute on function public.nova_verify_archive(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.nova_verify_archive(uuid,uuid,text) to service_role;

-- Guard even the legacy reward RPC. Prior receipts remain replayable, but a
-- new finish number and coin grant require server-verified evidence.
create or replace function public.nova_complete_archive(p_user_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_finish_number integer;
begin
  if p_user_id is null then
    raise exception 'Archive completion requires an account';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(17217, 1);

  select a.finish_number into v_finish_number
    from public.nova_archive_completions a where a.user_id = p_user_id;
  if found then
    return case when v_finish_number <= 20 then 'already_awarded' else 'completed' end;
  end if;

  if not exists (select 1 from public.nova_archive_verification v where v.user_id = p_user_id and v.verified_at is not null) then
    return 'unverified';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'Archive completion requires a profile';
  end if;

  select coalesce(max(a.finish_number), 0) + 1 into v_finish_number
    from public.nova_archive_completions a;

  insert into public.nova_archive_completions (finish_number, user_id)
    values (v_finish_number, p_user_id);

  if v_finish_number > 20 then
    return 'completed';
  end if;

  update public.profiles
    set coins = coalesce(coins, 0) + 25000, updated_at = now()
    where id = p_user_id;
  if not found then
    raise exception 'Archive reward profile was removed';
  end if;

  return 'awarded';
end;
$$;


revoke execute on function public.nova_complete_archive(uuid) from public, anon, authenticated;
grant execute on function public.nova_complete_archive(uuid) to service_role;
commit;
