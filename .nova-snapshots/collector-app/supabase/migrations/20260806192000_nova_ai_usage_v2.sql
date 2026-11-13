-- ============================================================================
-- Nova Tutoring v1.3
-- Nova AI usage architecture v2
--
-- Corrective migration for the already-applied Phase 1 schema.
--
-- IMPORTANT:
-- - Keeps old ai_usage and ai_subscriptions.questions_used temporarily.
-- - Adds atomic quota reservation/finalization.
-- - Only successful AI responses consume quota.
-- - Apple remains authoritative for subscription pricing.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Lock the launch allowances.
-- ---------------------------------------------------------------------------

update public.ai_plans
set
  monthly_question_limit = case id
    when 'free' then 5
    when 'basic' then 25
    when 'plus' then 75
    when 'pro' then 200
    when 'ultimate' then 500
    else monthly_question_limit
  end,

  -- Apple / StoreKit is the pricing source.
  -- Keep the old column temporarily so older frontend code cannot break,
  -- but deliberately stop storing canonical prices in it.
  price_usd = null,

  updated_at = now()
where id in (
  'free',
  'basic',
  'plus',
  'pro',
  'ultimate'
);

comment on column public.ai_plans.price_usd is
  'DEPRECATED. Apple StoreKit localized pricing is authoritative. Remove after all v1.3 clients stop selecting this column.';

comment on column public.ai_subscriptions.questions_used is
  'DEPRECATED. Usage is moving to public.ai_usage_periods. Kept temporarily for backend compatibility during v1.3 migration.';

-- ---------------------------------------------------------------------------
-- 2. One usage-counter row per user / entitlement period.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_usage_periods (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  plan_id text not null
    references public.ai_plans(id)
    on update cascade,

  period_start timestamptz not null,
  period_end timestamptz not null,

  questions_used integer not null default 0
    check (questions_used >= 0),

  questions_reserved integer not null default 0
    check (questions_reserved >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_usage_periods_valid_range
    check (period_end > period_start),

  constraint ai_usage_periods_unique_period
    unique (
      user_id,
      period_start,
      period_end
    )
);

create index if not exists ai_usage_periods_user_idx
  on public.ai_usage_periods (
    user_id,
    period_end desc
  );

create index if not exists ai_usage_periods_plan_idx
  on public.ai_usage_periods (
    plan_id,
    period_end desc
  );

drop trigger if exists ai_usage_periods_set_updated_at
  on public.ai_usage_periods;

create trigger ai_usage_periods_set_updated_at
before update on public.ai_usage_periods
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Immutable-ish request event history.
--
-- A request begins as RESERVED.
-- Successful OpenAI response -> SUCCEEDED.
-- OpenAI/network failure -> FAILED.
-- Abandoned stale reservation -> RELEASED.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),

  request_id uuid not null unique,

  user_id uuid
    references auth.users(id)
    on delete set null,

  plan_id text not null
    references public.ai_plans(id)
    on update cascade,

  period_id uuid
    references public.ai_usage_periods(id)
    on delete set null,

  status text not null
    check (
      status in (
        'reserved',
        'succeeded',
        'failed',
        'released'
      )
    ),

  model text,

  prompt_tokens integer not null default 0
    check (prompt_tokens >= 0),

  cached_input_tokens integer not null default 0
    check (cached_input_tokens >= 0),

  completion_tokens integer not null default 0
    check (completion_tokens >= 0),

  cost_usd_snapshot numeric(14,8) not null default 0
    check (cost_usd_snapshot >= 0),

  error_code text,

  created_at timestamptz not null default now(),
  finalized_at timestamptz,

  updated_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events (
    user_id,
    created_at desc
  );

create index if not exists ai_usage_events_period_idx
  on public.ai_usage_events (
    period_id,
    created_at desc
  );

create index if not exists ai_usage_events_status_idx
  on public.ai_usage_events (
    status,
    created_at
  );

drop trigger if exists ai_usage_events_set_updated_at
  on public.ai_usage_events;

create trigger ai_usage_events_set_updated_at
before update on public.ai_usage_events
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Preserve any counters that may already exist in ai_subscriptions.
-- ---------------------------------------------------------------------------

insert into public.ai_usage_periods (
  user_id,
  plan_id,
  period_start,
  period_end,
  questions_used,
  questions_reserved
)
select
  user_id,
  plan_id,
  period_start,
  period_end,
  greatest(questions_used, 0),
  0
from public.ai_subscriptions
where period_end > period_start

on conflict (
  user_id,
  period_start,
  period_end
)
do update set
  plan_id = excluded.plan_id,
  questions_used = greatest(
    public.ai_usage_periods.questions_used,
    excluded.questions_used
  ),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 5. Preserve any Phase 1 ai_usage analytics.
-- ---------------------------------------------------------------------------

insert into public.ai_usage_events (
  request_id,
  user_id,
  plan_id,
  status,
  model,
  prompt_tokens,
  cached_input_tokens,
  completion_tokens,
  cost_usd_snapshot,
  created_at,
  finalized_at
)
select
  request_id,
  user_id,
  plan_id,
  case
    when question_counted then 'succeeded'
    else 'failed'
  end,
  model,
  prompt_tokens,
  0,
  completion_tokens,
  estimated_cost_usd,
  created_at,
  created_at
from public.ai_usage

on conflict (request_id)
do nothing;

-- ===========================================================================
-- 6. ATOMIC RESERVATION RPC
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

  -- Ensure this billing/usage period exists.
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

  -- Lock the counter row. Concurrent Ask requests for this user/period
  -- now serialize here so they cannot race past the quota.
  select *
  into v_period
  from public.ai_usage_periods
  where user_id = p_user_id
    and period_start = p_period_start
    and period_end = p_period_end
  for update;

  -- Recover reservations abandoned by a crashed server/request.
  update public.ai_usage_events
  set
    status = 'released',
    error_code = coalesce(
      error_code,
      'stale_reservation'
    ),
    finalized_at = now(),
    updated_at = now()
  where period_id = v_period.id
    and status = 'reserved'
    and created_at < now() - interval '15 minutes';

  get diagnostics v_stale_count = row_count;

  if v_stale_count > 0 then
    update public.ai_usage_periods
    set
      questions_reserved = greatest(
        questions_reserved - v_stale_count,
        0
      ),
      updated_at = now()
    where id = v_period.id;

    select *
    into v_period
    from public.ai_usage_periods
    where id = v_period.id;
  end if;

  -- request_id makes retries idempotent.
  select *
  into v_existing_event
  from public.ai_usage_events
  where request_id = p_request_id;

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

  -- Hard quota check.
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

  update public.ai_usage_periods
  set
    questions_reserved =
      questions_reserved + 1,
    updated_at = now()
  where id = v_period.id
  returning *
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
-- 7. SUCCESS FINALIZATION RPC
--
-- Exactly one reserved question becomes one used question.
-- Re-running the RPC for an already-succeeded request does not double-count.
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
  select *
  into v_event
  from public.ai_usage_events
  where request_id = p_request_id
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

  select *
  into v_period
  from public.ai_usage_periods
  where id = v_event.period_id
  for update;

  -- Idempotent retry.
  if v_event.status = 'succeeded' then
    return query
    select
      true,
      'succeeded'::text,
      v_period.questions_used,
      v_period.questions_reserved;

    return;
  end if;

  -- A failed/released event cannot later consume quota.
  if v_event.status <> 'reserved' then
    return query
    select
      false,
      v_event.status,
      v_period.questions_used,
      v_period.questions_reserved;

    return;
  end if;

  update public.ai_usage_periods
  set
    questions_reserved = greatest(
      questions_reserved - 1,
      0
    ),
    questions_used =
      questions_used + 1,
    updated_at = now()
  where id = v_period.id
  returning *
  into v_period;

  update public.ai_usage_events
  set
    status = 'succeeded',
    model = coalesce(
      nullif(trim(p_model), ''),
      model
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
  where request_id = p_request_id;

  return query
  select
    true,
    'succeeded'::text,
    v_period.questions_used,
    v_period.questions_reserved;
end;
$$;

-- ===========================================================================
-- 8. FAILURE / RELEASE RPC
--
-- Failed OpenAI calls give the reserved question back.
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
  select *
  into v_event
  from public.ai_usage_events
  where request_id = p_request_id
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

  select *
  into v_period
  from public.ai_usage_periods
  where id = v_event.period_id
  for update;

  -- Already terminal: do not modify counters again.
  if v_event.status <> 'reserved' then
    return query
    select
      false,
      v_event.status,
      v_period.questions_used,
      v_period.questions_reserved;

    return;
  end if;

  update public.ai_usage_periods
  set
    questions_reserved = greatest(
      questions_reserved - 1,
      0
    ),
    updated_at = now()
  where id = v_period.id
  returning *
  into v_period;

  update public.ai_usage_events
  set
    status = 'failed',
    error_code = nullif(
      trim(p_error_code),
      ''
    ),
    finalized_at = now(),
    updated_at = now()
  where request_id = p_request_id;

  return query
  select
    true,
    'failed'::text,
    v_period.questions_used,
    v_period.questions_reserved;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. RLS.
-- ---------------------------------------------------------------------------

alter table public.ai_usage_periods
  enable row level security;

alter table public.ai_usage_events
  enable row level security;

drop policy if exists
  "Users can read their own AI usage periods"
  on public.ai_usage_periods;

create policy
  "Users can read their own AI usage periods"
on public.ai_usage_periods
for select
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists
  "Users can read their own AI usage events"
  on public.ai_usage_events;

create policy
  "Users can read their own AI usage events"
on public.ai_usage_events
for select
to authenticated
using (
  auth.uid() = user_id
);

grant select
  on public.ai_usage_periods
  to authenticated;

grant select
  on public.ai_usage_events
  to authenticated;

-- App clients must never call quota-mutating functions directly.
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
