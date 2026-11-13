-- Nova Tutoring — production streak fix
-- Rolling 24-hour streak logic + single-use Axolotl shield.
--
-- <=24h since most recent app streak activity: streak +1
-- >24h and <=48h: armed Axolotl may protect once
-- >48h: reset to 1
-- After Axolotl protects, one normal <=24h login re-arms it.
-- Same-day repeat activity refreshes the rolling 24h timestamp but does
-- not award again or increment the streak again.
--
-- This does NOT rewrite existing streak history or coins.

begin;

CREATE OR REPLACE FUNCTION public.nova_mark_daily_streak(p_event_key text)
 RETURNS TABLE(awarded boolean, reason text, day_key date, streak_days integer, best_streak integer, last_day date, shield_used boolean, base_coins integer, specialist_bonus integer, aetherwyrm_bonus integer, coins_awarded integer, next_base_coins integer, next_coins integer, has_axolotl boolean, has_celestra boolean, has_aetherwyrm boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_day date := (timezone('America/New_York', now()))::date;
  v_event_key text := trim(coalesce(p_event_key, ''));

  v_current integer := 0;
  v_best integer := 0;
  v_last date := null;
  v_last_at timestamptz := null;
  v_axolotl_last date := null;
  v_next integer := 1;
  v_next_best integer := 1;
  v_diff integer := null;
  v_shield boolean := false;

  v_has_axolotl boolean := false;
  v_has_celestra boolean := false;
  v_has_aether boolean := false;

  v_base integer := 0;
  v_after_celestra integer := 0;
  v_specialist integer := 0;
  v_after_aether integer := 0;
  v_aether integer := 0;

  v_next_base integer := 0;
  v_next_after_celestra integer := 0;
  v_next_total integer := 0;

  v_inserted boolean := false;
  v_claim public.economy_streak_daily%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_event_key = '' or length(v_event_key) > 220 then
    raise exception 'Invalid event key';
  end if;

  insert into public.economy_streak_state (
    user_id,
    current_streak,
    best_streak,
    last_day
  )
  select
    p.id,
    greatest(coalesce(p.daily_streak_current, 0), 0),
    greatest(
      coalesce(p.daily_streak_best, 0),
      coalesce(p.daily_streak_current, 0),
      0
    ),
    case
      when p.daily_streak_last_utc is null then null
      when left(p.daily_streak_last_utc::text, 10)
        ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        then left(p.daily_streak_last_utc::text, 10)::date
      else null
    end
  from public.profiles p
  where p.id = v_uid
  on conflict (user_id) do nothing;

  select
    position('axolotl' in lower(coalesce(p.purchases::text, ''))) > 0,
    position('celestra' in lower(coalesce(p.purchases::text, ''))) > 0,
    position('aetherwyrm' in lower(coalesce(p.purchases::text, ''))) > 0
  into
    v_has_axolotl,
    v_has_celestra,
    v_has_aether
  from public.profiles p
  where p.id = v_uid;

  v_has_axolotl := coalesce(v_has_axolotl, false);
  v_has_celestra := coalesce(v_has_celestra, false);
  v_has_aether := coalesce(v_has_aether, false);

  select
    s.current_streak,
    s.best_streak,
    s.last_day,
    s.updated_at,
    s.axolotl_last_used
  into
    v_current,
    v_best,
    v_last,
    v_last_at,
    v_axolotl_last
  from public.economy_streak_state s
  where s.user_id = v_uid
  for update;

  -- If today was already processed, never advance the streak again.
  if v_last = v_day then
    select *
    into v_claim
    from public.economy_streak_daily d
    where d.user_id = v_uid
      and d.day_key = v_day;

    v_next_base := least(50, 5 + greatest(v_current, 0) * 2);
    v_next_after_celestra := case
      when v_has_celestra then round(v_next_base * 1.25)::integer
      else v_next_base
    end;
    v_next_total := case
      when v_has_aether then round(v_next_after_celestra * 1.20)::integer
      else v_next_after_celestra
    end;

    -- Same-day activity should refresh the rolling 24-hour clock even though
    -- the daily streak/reward must remain idempotent.
    update public.economy_streak_state
    set updated_at = now()
    where user_id = v_uid;

    return query select
      false,
      case when found then 'already_claimed' else 'already_marked' end,
      v_day,
      coalesce(v_current, 0),
      coalesce(v_best, 0),
      v_last,
      false,
      0,
      0,
      0,
      0,
      v_next_base,
      v_next_total,
      v_has_axolotl,
      v_has_celestra,
      v_has_aether;
    return;
  end if;

  if v_last is null or v_last_at is null then
    v_next := 1;
  else
    v_diff := v_day - v_last;

    if now() < v_last_at then
      -- Defensive fallback for unexpected future-dated state.
      v_next := greatest(v_current, 1);

    elsif now() - v_last_at <= interval '24 hours' then
      -- Normal consecutive login: advance the streak.
      v_next := greatest(v_current, 0) + 1;

      -- One normal consecutive login after a shield save re-arms Axolotl.
      if v_has_axolotl and v_axolotl_last is not null then
        v_axolotl_last := null;
      end if;

    elsif now() - v_last_at <= interval '48 hours' then
      -- Exactly one 24-hour login window was missed.
      if v_has_axolotl and v_axolotl_last is null then
        v_next := greatest(v_current, 0) + 1;
        v_shield := true;
      else
        v_next := 1;
      end if;

    else
      -- More than one missed 24-hour login window can never be shielded.
      v_next := 1;
    end if;
  end if;

  v_next_best := greatest(v_best, v_next);

  update public.economy_streak_state
  set
    current_streak = v_next,
    best_streak = v_next_best,
    last_day = v_day,
    axolotl_last_used = case
      when v_shield then v_day
      when v_has_axolotl and v_axolotl_last is null then null
      else axolotl_last_used
    end,
    updated_at = now()
  where user_id = v_uid;

  perform public.nova_mirror_profile_streak(
    v_uid,
    v_next,
    v_next_best,
    v_day
  );

  v_base := least(50, 5 + (greatest(v_next, 1) - 1) * 2);
  v_after_celestra := case
    when v_has_celestra then round(v_base * 1.25)::integer
    else v_base
  end;
  v_specialist := v_after_celestra - v_base;

  v_after_aether := case
    when v_has_aether then round(v_after_celestra * 1.20)::integer
    else v_after_celestra
  end;
  v_aether := v_after_aether - v_after_celestra;

  insert into public.economy_streak_daily (
    user_id,
    day_key,
    streak_days,
    base_coins,
    specialist_bonus,
    aetherwyrm_bonus,
    actual_coins,
    shield_used,
    migrated_existing_claim
  ) values (
    v_uid,
    v_day,
    v_next,
    v_base,
    v_specialist,
    v_aether,
    v_after_aether,
    v_shield,
    false
  )
  on conflict on constraint economy_streak_daily_pkey do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    select *
    into v_claim
    from public.economy_streak_daily d
    where d.user_id = v_uid
      and d.day_key = v_day;

    return query select
      false,
      'already_claimed',
      v_day,
      coalesce(v_claim.streak_days, v_next),
      greatest(v_next_best, coalesce(v_claim.streak_days, 0)),
      v_day,
      coalesce(v_claim.shield_used, false),
      0,
      0,
      0,
      0,
      least(50, 5 + greatest(coalesce(v_claim.streak_days, v_next), 0) * 2),
      case
        when v_has_aether then round(
          (case
            when v_has_celestra then round(
              least(50, 5 + greatest(coalesce(v_claim.streak_days, v_next), 0) * 2) * 1.25
            )::integer
            else least(50, 5 + greatest(coalesce(v_claim.streak_days, v_next), 0) * 2)
          end) * 1.20
        )::integer
        when v_has_celestra then round(
          least(50, 5 + greatest(coalesce(v_claim.streak_days, v_next), 0) * 2) * 1.25
        )::integer
        else least(50, 5 + greatest(coalesce(v_claim.streak_days, v_next), 0) * 2)
      end,
      v_has_axolotl,
      v_has_celestra,
      v_has_aether;
    return;
  end if;

  update public.profiles
  set
    coins = coalesce(coins, 0) + v_after_aether,
    updated_at = now()
  where id = v_uid;

  if not found then
    raise exception 'Profile row not found for authenticated user';
  end if;

  insert into public.economy_reward_events (
    user_id,
    event_key,
    source,
    topic_id,
    base_coins,
    bonus_coins,
    actual_coins,
    metadata
  ) values (
    v_uid,
    v_event_key,
    'daily_streak_reward',
    null,
    v_base,
    v_specialist + v_aether,
    v_after_aether,
    jsonb_build_object(
      'dayKey', v_day,
      'streakDays', v_next,
      'specialistBonus', v_specialist,
      'aetherwyrmBonus', v_aether,
      'shieldUsed', v_shield,
      'celestra', v_has_celestra,
      'aetherwyrm', v_has_aether,
      'serverEconomyVersion', 4
    )
  )
  on conflict (user_id, event_key) do nothing;

  v_next_base := least(50, 5 + greatest(v_next, 0) * 2);
  v_next_after_celestra := case
    when v_has_celestra then round(v_next_base * 1.25)::integer
    else v_next_base
  end;
  v_next_total := case
    when v_has_aether then round(v_next_after_celestra * 1.20)::integer
    else v_next_after_celestra
  end;

  return query select
    true,
    'awarded',
    v_day,
    v_next,
    v_next_best,
    v_day,
    v_shield,
    v_base,
    v_specialist,
    v_aether,
    v_after_aether,
    v_next_base,
    v_next_total,
    v_has_axolotl,
    v_has_celestra,
    v_has_aether;
end;
$function$;

commit;
