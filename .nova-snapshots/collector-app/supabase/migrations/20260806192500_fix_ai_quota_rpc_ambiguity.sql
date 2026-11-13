-- Nova Tutoring v1.3
-- Fix PL/pgSQL output-variable / column-name ambiguity
-- in Nova AI quota RPCs.

begin;

-- ===========================================================================
-- RESERVE
-- ===========================================================================

create or replace function public.reserve_ai_question(
  p_user_id uuid,
  p_plan_id text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_question_limit integer,
  p_request_id uuid,
  p_model text default null
)
returns table (
  allowed boolean,
  already_exists boolean,
  usage_period_id uuid,
  event_status text,
  questions_used integer,
  questions_reserved integer,
  question_limit integer,
  questions_remaining integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_period public.ai_usage_periods%rowtype;
  v_existing_event public.ai_usage_events%rowtype;
  v_stale_count integer := 0;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_plan_id not in (
    'free',
    'basic',
    'plus',
    'pro',
    'ultimate'
  ) then
    raise exception 'invalid AI plan';
  end if;

  if p_question_limit <= 0 then
    raise exception 'question limit must be greater than zero';
  end if;

  if p_period_end <= p_period_start then
    raise exception 'invalid usage period';
  end if;

  if p_request_id is null then
    raise exception 'request_id is required';
  end if;

  insert into public.ai_usage_periods (
    user_id,
    plan_id,
    period_start,
    period_end,
    questions_used,
    questions_reserved
  )
  values (
    p_user_id,
    p_plan_id,
    p_period_start,
    p_period_end,
    0,
    0
  )
  on conflict (
    user_id,
    period_start,
    period_end
  )
  do update set
    plan_id = excluded.plan_id,
    updated_at = now();

  select p.*
  into v_period
  from public.ai_usage_periods as p
  where p.user_id = p_user_id
    and p.period_start = p_period_start
    and p.period_end = p_period_end
  for update;

  -- Release abandoned reservations.
  update public.ai_usage_events as e
  set
    status = 'released',
    error_code = coalesce(
      e.error_code,
      'stale_reservation'
    ),
    finalized_at = now(),
    updated_at = now()
  where e.period_id = v_period.id
    and e.status = 'reserved'
    and e.created_at < now() - interval '15 minutes';

  get diagnostics v_stale_count = row_count;

  if v_stale_count > 0 then
    update public.ai_usage_periods as p
    set
      questions_reserved = greatest(
        p.questions_reserved - v_stale_count,
        0
      ),
      updated_at = now()
    where p.id = v_period.id
    returning p.*
    into v_period;
  end if;

  select e.*
  into v_existing_event
  from public.ai_usage_events as e
  where e.request_id = p_request_id;

  if found then
    return query
    select
      false,
      true,
      v_period.id,
      v_existing_event.status,
      v_period.questions_used,
      v_period.questions_reserved,
      p_question_limit,
      greatest(
        p_question_limit
          - v_period.questions_used
          - v_period.questions_reserved,
        0
      );

    return;
  end if;

  if (
    v_period.questions_used
    + v_period.questions_reserved
  ) >= p_question_limit then

    return query
    select
      false,
      false,
      v_period.id,
      'quota_exhausted'::text,
      v_period.questions_used,
      v_period.questions_reserved,
      p_question_limit,
      0;

    return;
  end if;

  update public.ai_usage_periods as p
  set
    questions_reserved =
      p.questions_reserved + 1,
    updated_at = now()
  where p.id = v_period.id
  returning p.*
  into v_period;

  insert into public.ai_usage_events (
    request_id,
    user_id,
    plan_id,
    period_id,
    status,
    model
  )
  values (
    p_request_id,
    p_user_id,
    p_plan_id,
    v_period.id,
    'reserved',
    nullif(trim(p_model), '')
  );

  return query
  select
    true,
    false,
    v_period.id,
    'reserved'::text,
    v_period.questions_used,
    v_period.questions_reserved,
    p_question_limit,
    greatest(
      p_question_limit
        - v_period.questions_used
        - v_period.questions_reserved,
      0
    );
end;
$$;


-- ===========================================================================
-- FINALIZE SUCCESS
-- ===========================================================================

create or replace function public.finalize_ai_question(
  p_request_id uuid,
  p_model text default null,
  p_prompt_tokens integer default 0,
  p_cached_input_tokens integer default 0,
  p_completion_tokens integer default 0,
  p_cost_usd_snapshot numeric default 0
)
returns table (
  finalized boolean,
  event_status text,
  questions_used integer,
  questions_reserved integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.ai_usage_events%rowtype;
  v_period public.ai_usage_periods%rowtype;
begin
  select e.*
  into v_event
  from public.ai_usage_events as e
  where e.request_id = p_request_id
  for update;

  if not found then
    return query
    select
      false,
      'not_found'::text,
      0,
      0;

    return;
  end if;

  if v_event.period_id is null then
    return query
    select
      false,
      v_event.status,
      0,
      0;

    return;
  end if;

  select p.*
  into v_period
  from public.ai_usage_periods as p
  where p.id = v_event.period_id
  for update;

  if v_event.status = 'succeeded' then
    return query
    select
      true,
      'succeeded'::text,
      v_period.questions_used,
      v_period.questions_reserved;

    return;
  end if;

  if v_event.status <> 'reserved' then
    return query
    select
      false,
      v_event.status,
      v_period.questions_used,
      v_period.questions_reserved;

    return;
  end if;

  update public.ai_usage_periods as p
  set
    questions_reserved = greatest(
      p.questions_reserved - 1,
      0
    ),
    questions_used =
      p.questions_used + 1,
    updated_at = now()
  where p.id = v_period.id
  returning p.*
  into v_period;

  update public.ai_usage_events as e
  set
    status = 'succeeded',
    model = coalesce(
      nullif(trim(p_model), ''),
      e.model
    ),
    prompt_tokens = greatest(
      coalesce(p_prompt_tokens, 0),
      0
    ),
    cached_input_tokens = greatest(
      coalesce(p_cached_input_tokens, 0),
      0
    ),
    completion_tokens = greatest(
      coalesce(p_completion_tokens, 0),
      0
    ),
    cost_usd_snapshot = greatest(
      coalesce(p_cost_usd_snapshot, 0),
      0
    ),
    finalized_at = now(),
    updated_at = now()
  where e.request_id = p_request_id;

  return query
  select
    true,
    'succeeded'::text,
    v_period.questions_used,
    v_period.questions_reserved;
end;
$$;


-- ===========================================================================
-- RELEASE FAILURE
-- ===========================================================================

create or replace function public.release_ai_question(
  p_request_id uuid,
  p_error_code text default null
)
returns table (
  released boolean,
  event_status text,
  questions_used integer,
  questions_reserved integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.ai_usage_events%rowtype;
  v_period public.ai_usage_periods%rowtype;
begin
  select e.*
  into v_event
  from public.ai_usage_events as e
  where e.request_id = p_request_id
  for update;

  if not found then
    return query
    select
      false,
      'not_found'::text,
      0,
      0;

    return;
  end if;

  if v_event.period_id is null then
    return query
    select
      false,
      v_event.status,
      0,
      0;

    return;
  end if;

  select p.*
  into v_period
  from public.ai_usage_periods as p
  where p.id = v_event.period_id
  for update;

  if v_event.status <> 'reserved' then
    return query
    select
      false,
      v_event.status,
      v_period.questions_used,
      v_period.questions_reserved;

    return;
  end if;

  update public.ai_usage_periods as p
  set
    questions_reserved = greatest(
      p.questions_reserved - 1,
      0
    ),
    updated_at = now()
  where p.id = v_period.id
  returning p.*
  into v_period;

  update public.ai_usage_events as e
  set
    status = 'failed',
    error_code = nullif(
      trim(p_error_code),
      ''
    ),
    finalized_at = now(),
    updated_at = now()
  where e.request_id = p_request_id;

  return query
  select
    true,
    'failed'::text,
    v_period.questions_used,
    v_period.questions_reserved;
end;
$$;


-- Keep quota mutation server-only.

revoke all
on function public.reserve_ai_question(
  uuid,
  text,
  timestamptz,
  timestamptz,
  integer,
  uuid,
  text
)
from public, anon, authenticated;

revoke all
on function public.finalize_ai_question(
  uuid,
  text,
  integer,
  integer,
  integer,
  numeric
)
from public, anon, authenticated;

revoke all
on function public.release_ai_question(
  uuid,
  text
)
from public, anon, authenticated;


grant execute
on function public.reserve_ai_question(
  uuid,
  text,
  timestamptz,
  timestamptz,
  integer,
  uuid,
  text
)
to service_role;

grant execute
on function public.finalize_ai_question(
  uuid,
  text,
  integer,
  integer,
  integer,
  numeric
)
to service_role;

grant execute
on function public.release_ai_question(
  uuid,
  text
)
to service_role;

commit;
