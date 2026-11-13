-- Nova Tutoring v1.3 — anonymous guest Nova AI quota
-- Guest allowance: 2 successful questions total per anonymous app installation.
-- The app sends an opaque installation id; Flask stores only an HMAC-SHA256 hash.
-- No guest question text or conversation history is stored by this migration.

begin;

create extension if not exists pgcrypto;

create table if not exists public.guest_ai_usage (
  guest_key_hash text primary key,
  questions_used integer not null default 0
    check (questions_used >= 0),
  questions_reserved integer not null default 0
    check (questions_reserved >= 0),
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint guest_ai_usage_hash_check
    check (guest_key_hash ~ '^[0-9a-f]{64}$')
);

create table if not exists public.guest_ai_usage_events (
  request_id uuid primary key,
  guest_key_hash text not null
    references public.guest_ai_usage(guest_key_hash)
    on delete cascade,
  status text not null default 'reserved'
    check (status in ('reserved', 'succeeded', 'released')),
  model text,
  prompt_tokens integer not null default 0
    check (prompt_tokens >= 0),
  cached_input_tokens integer not null default 0
    check (cached_input_tokens >= 0),
  completion_tokens integer not null default 0
    check (completion_tokens >= 0),
  estimated_cost_usd numeric(14,8) not null default 0
    check (estimated_cost_usd >= 0),
  error_code text,
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

create index if not exists guest_ai_usage_events_guest_created_idx
  on public.guest_ai_usage_events(guest_key_hash, created_at desc);

create index if not exists guest_ai_usage_events_status_created_idx
  on public.guest_ai_usage_events(status, created_at);

alter table public.guest_ai_usage enable row level security;
alter table public.guest_ai_usage_events enable row level security;

-- No guest quota rows are readable or writable by the app directly.
-- Flask uses the service-role key and the RPCs below.
revoke all on table public.guest_ai_usage from anon, authenticated;
revoke all on table public.guest_ai_usage_events from anon, authenticated;

create or replace function public.get_guest_ai_usage_status(
  p_guest_key_hash text,
  p_question_limit integer
)
returns table (
  questions_used integer,
  questions_reserved integer,
  questions_remaining integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer := greatest(coalesce(p_question_limit, 0), 0);
  v_used integer := 0;
  v_reserved integer := 0;
  v_stale_count integer := 0;
begin
  if p_guest_key_hash is null
     or p_guest_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid guest key hash';
  end if;

  if v_limit <= 0 then
    raise exception 'question limit must be positive';
  end if;

  insert into public.guest_ai_usage (
    guest_key_hash
  )
  values (
    p_guest_key_hash
  )
  on conflict (guest_key_hash) do nothing;

  select
    u.questions_used,
    u.questions_reserved
  into
    v_used,
    v_reserved
  from public.guest_ai_usage as u
  where u.guest_key_hash = p_guest_key_hash
  for update;

  select count(*)::integer
  into v_stale_count
  from public.guest_ai_usage_events as e
  where e.guest_key_hash = p_guest_key_hash
    and e.status = 'reserved'
    and e.created_at < now() - interval '15 minutes';

  if v_stale_count > 0 then
    update public.guest_ai_usage_events as e
    set
      status = 'released',
      error_code = coalesce(e.error_code, 'stale_reservation'),
      finalized_at = now()
    where e.guest_key_hash = p_guest_key_hash
      and e.status = 'reserved'
      and e.created_at < now() - interval '15 minutes';

    update public.guest_ai_usage as u
    set
      questions_reserved = greatest(
        0,
        u.questions_reserved - v_stale_count
      ),
      updated_at = now()
    where u.guest_key_hash = p_guest_key_hash
    returning
      u.questions_used,
      u.questions_reserved
    into
      v_used,
      v_reserved;
  end if;

  return query
  select
    v_used,
    v_reserved,
    greatest(v_limit - v_used - v_reserved, 0);
end;
$$;

create or replace function public.reserve_guest_ai_question(
  p_guest_key_hash text,
  p_question_limit integer,
  p_request_id uuid,
  p_model text
)
returns table (
  allowed boolean,
  questions_used integer,
  questions_reserved integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer := greatest(coalesce(p_question_limit, 0), 0);
  v_used integer := 0;
  v_reserved integer := 0;
  v_stale_count integer := 0;
begin
  if p_guest_key_hash is null
     or p_guest_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid guest key hash';
  end if;

  if p_request_id is null then
    raise exception 'request id is required';
  end if;

  if v_limit <= 0 then
    raise exception 'question limit must be positive';
  end if;

  insert into public.guest_ai_usage (
    guest_key_hash
  )
  values (
    p_guest_key_hash
  )
  on conflict (guest_key_hash) do nothing;

  -- Serialize quota decisions for this guest installation.
  select
    u.questions_used,
    u.questions_reserved
  into
    v_used,
    v_reserved
  from public.guest_ai_usage as u
  where u.guest_key_hash = p_guest_key_hash
  for update;

  -- Release reservations left behind by a crashed request.
  select count(*)::integer
  into v_stale_count
  from public.guest_ai_usage_events as e
  where e.guest_key_hash = p_guest_key_hash
    and e.status = 'reserved'
    and e.created_at < now() - interval '15 minutes';

  if v_stale_count > 0 then
    update public.guest_ai_usage_events as e
    set
      status = 'released',
      error_code = coalesce(e.error_code, 'stale_reservation'),
      finalized_at = now()
    where e.guest_key_hash = p_guest_key_hash
      and e.status = 'reserved'
      and e.created_at < now() - interval '15 minutes';

    update public.guest_ai_usage as u
    set
      questions_reserved = greatest(
        0,
        u.questions_reserved - v_stale_count
      ),
      updated_at = now()
    where u.guest_key_hash = p_guest_key_hash
    returning
      u.questions_used,
      u.questions_reserved
    into
      v_used,
      v_reserved;
  end if;

  if v_used + v_reserved >= v_limit then
    return query
    select false, v_used, v_reserved;
    return;
  end if;

  insert into public.guest_ai_usage_events (
    request_id,
    guest_key_hash,
    status,
    model
  )
  values (
    p_request_id,
    p_guest_key_hash,
    'reserved',
    nullif(trim(coalesce(p_model, '')), '')
  );

  update public.guest_ai_usage as u
  set
    questions_reserved = u.questions_reserved + 1,
    updated_at = now()
  where u.guest_key_hash = p_guest_key_hash
  returning
    u.questions_used,
    u.questions_reserved
  into
    v_used,
    v_reserved;

  return query
  select true, v_used, v_reserved;
end;
$$;

create or replace function public.finalize_guest_ai_question(
  p_request_id uuid,
  p_model text,
  p_prompt_tokens integer,
  p_cached_input_tokens integer,
  p_completion_tokens integer,
  p_cost_usd_snapshot numeric
)
returns table (
  finalized boolean,
  questions_used integer,
  questions_reserved integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash text;
  v_status text;
  v_used integer := 0;
  v_reserved integer := 0;
begin
  select
    e.guest_key_hash,
    e.status
  into
    v_hash,
    v_status
  from public.guest_ai_usage_events as e
  where e.request_id = p_request_id
  for update;

  if not found then
    return query select false, 0, 0;
    return;
  end if;

  if v_status = 'succeeded' then
    select
      u.questions_used,
      u.questions_reserved
    into
      v_used,
      v_reserved
    from public.guest_ai_usage as u
    where u.guest_key_hash = v_hash;

    return query select true, v_used, v_reserved;
    return;
  end if;

  if v_status <> 'reserved' then
    select
      u.questions_used,
      u.questions_reserved
    into
      v_used,
      v_reserved
    from public.guest_ai_usage as u
    where u.guest_key_hash = v_hash;

    return query select false, coalesce(v_used, 0), coalesce(v_reserved, 0);
    return;
  end if;

  update public.guest_ai_usage as u
  set
    questions_reserved = greatest(0, u.questions_reserved - 1),
    questions_used = u.questions_used + 1,
    last_success_at = now(),
    updated_at = now()
  where u.guest_key_hash = v_hash
  returning
    u.questions_used,
    u.questions_reserved
  into
    v_used,
    v_reserved;

  update public.guest_ai_usage_events as e
  set
    status = 'succeeded',
    model = coalesce(nullif(trim(coalesce(p_model, '')), ''), e.model),
    prompt_tokens = greatest(coalesce(p_prompt_tokens, 0), 0),
    cached_input_tokens = greatest(coalesce(p_cached_input_tokens, 0), 0),
    completion_tokens = greatest(coalesce(p_completion_tokens, 0), 0),
    estimated_cost_usd = greatest(coalesce(p_cost_usd_snapshot, 0), 0),
    finalized_at = now()
  where e.request_id = p_request_id;

  return query select true, v_used, v_reserved;
end;
$$;

create or replace function public.release_guest_ai_question(
  p_request_id uuid,
  p_error_code text default null
)
returns table (
  released boolean,
  questions_used integer,
  questions_reserved integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash text;
  v_status text;
  v_used integer := 0;
  v_reserved integer := 0;
begin
  select
    e.guest_key_hash,
    e.status
  into
    v_hash,
    v_status
  from public.guest_ai_usage_events as e
  where e.request_id = p_request_id
  for update;

  if not found then
    return query select false, 0, 0;
    return;
  end if;

  select
    u.questions_used,
    u.questions_reserved
  into
    v_used,
    v_reserved
  from public.guest_ai_usage as u
  where u.guest_key_hash = v_hash
  for update;

  if v_status <> 'reserved' then
    return query
    select false, coalesce(v_used, 0), coalesce(v_reserved, 0);
    return;
  end if;

  update public.guest_ai_usage as u
  set
    questions_reserved = greatest(0, u.questions_reserved - 1),
    updated_at = now()
  where u.guest_key_hash = v_hash
  returning
    u.questions_used,
    u.questions_reserved
  into
    v_used,
    v_reserved;

  update public.guest_ai_usage_events as e
  set
    status = 'released',
    error_code = nullif(trim(coalesce(p_error_code, '')), ''),
    finalized_at = now()
  where e.request_id = p_request_id;

  return query select true, v_used, v_reserved;
end;
$$;

revoke all on function public.get_guest_ai_usage_status(text, integer)
  from public, anon, authenticated;
revoke all on function public.reserve_guest_ai_question(text, integer, uuid, text)
  from public, anon, authenticated;
revoke all on function public.finalize_guest_ai_question(uuid, text, integer, integer, integer, numeric)
  from public, anon, authenticated;
revoke all on function public.release_guest_ai_question(uuid, text)
  from public, anon, authenticated;

grant execute on function public.get_guest_ai_usage_status(text, integer)
  to service_role;
grant execute on function public.reserve_guest_ai_question(text, integer, uuid, text)
  to service_role;
grant execute on function public.finalize_guest_ai_question(uuid, text, integer, integer, integer, numeric)
  to service_role;
grant execute on function public.release_guest_ai_question(uuid, text)
  to service_role;

commit;
