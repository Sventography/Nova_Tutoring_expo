-- Nova Tutoring v1.3
-- Apple auto-renewable subscription and Ask usage foundation.
-- Safe to run more than once.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Updated-at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- AI plan catalog
--
-- Ask personalities intentionally remain separate permanent Shop purchases.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_plans (
  id text primary key,

  display_name text not null,
  apple_product_id text unique,

  monthly_question_limit integer not null
    check (monthly_question_limit > 0),

  memory_message_limit integer not null
    check (memory_message_limit >= 0),

  price_usd numeric(8, 2),

  sort_order integer not null default 0,
  active boolean not null default true,

  voice_enabled boolean not null default false,
  image_enabled boolean not null default false,
  documents_enabled boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_plans_id_check
    check (
      id in (
        'free',
        'basic',
        'plus',
        'pro',
        'ultimate'
      )
    )
);

drop trigger if exists ai_plans_set_updated_at
  on public.ai_plans;

create trigger ai_plans_set_updated_at
before update on public.ai_plans
for each row
execute function public.set_updated_at();

insert into public.ai_plans (
  id,
  display_name,
  apple_product_id,
  monthly_question_limit,
  memory_message_limit,
  price_usd,
  sort_order,
  active,
  voice_enabled,
  image_enabled,
  documents_enabled
)
values
  (
    'free',
    'Nova AI Free',
    null,
    30,
    5,
    null,
    0,
    true,
    false,
    false,
    false
  ),
  (
    'basic',
    'Nova AI Basic',
    'nova_ai_basic_monthly',
    250,
    25,
    2.99,
    1,
    true,
    false,
    false,
    false
  ),
  (
    'plus',
    'Nova AI Plus',
    'nova_ai_plus_monthly',
    750,
    75,
    5.99,
    2,
    true,
    false,
    false,
    false
  ),
  (
    'pro',
    'Nova AI Pro',
    'nova_ai_pro_monthly',
    2000,
    200,
    9.99,
    3,
    true,
    false,
    false,
    false
  ),
  (
    'ultimate',
    'Nova AI Ultimate',
    'nova_ai_ultimate_monthly',
    5000,
    500,
    14.99,
    4,
    true,
    false,
    false,
    false
  )
on conflict (id)
do update set
  display_name = excluded.display_name,
  apple_product_id = excluded.apple_product_id,
  monthly_question_limit = excluded.monthly_question_limit,
  memory_message_limit = excluded.memory_message_limit,
  price_usd = excluded.price_usd,
  sort_order = excluded.sort_order,
  active = excluded.active,
  voice_enabled = excluded.voice_enabled,
  image_enabled = excluded.image_enabled,
  documents_enabled = excluded.documents_enabled,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Verified Apple subscription entitlement for each registered user.
--
-- This table is authoritative.
-- Subscriptions must not be written into profiles.purchases.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_subscriptions (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  plan_id text not null default 'free'
    references public.ai_plans(id)
    on update cascade,

  status text not null default 'free'
    check (
      status in (
        'free',
        'active',
        'grace_period',
        'billing_retry',
        'expired',
        'revoked'
      )
    ),

  apple_product_id text,

  original_transaction_id text,
  latest_transaction_id text,

  period_start timestamptz not null default now(),

  period_end timestamptz not null
    default (now() + interval '30 days'),

  questions_used integer not null default 0
    check (questions_used >= 0),

  last_question_at timestamptz,

  verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_subscriptions_paid_plan_requires_product
    check (
      plan_id = 'free'
      or apple_product_id is not null
    )
);

create unique index if not exists
  ai_subscriptions_original_transaction_uidx
on public.ai_subscriptions(original_transaction_id)
where original_transaction_id is not null;

create index if not exists
  ai_subscriptions_plan_idx
on public.ai_subscriptions(plan_id);

create index if not exists
  ai_subscriptions_period_end_idx
on public.ai_subscriptions(period_end);

drop trigger if exists ai_subscriptions_set_updated_at
  on public.ai_subscriptions;

create trigger ai_subscriptions_set_updated_at
before update on public.ai_subscriptions
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Per-request token and cost analytics.
--
-- The Flask backend inserts a row only after a successful OpenAI response.
-- request_id protects against accidental duplicate counting.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_usage (
  id bigint generated by default as identity primary key,

  request_id uuid not null
    default gen_random_uuid()
    unique,

  user_id uuid
    references auth.users(id)
    on delete set null,

  plan_id text not null
    references public.ai_plans(id),

  model text not null,

  prompt_tokens integer not null default 0
    check (prompt_tokens >= 0),

  completion_tokens integer not null default 0
    check (completion_tokens >= 0),

  total_tokens integer generated always as (
    prompt_tokens + completion_tokens
  ) stored,

  estimated_cost_usd numeric(14, 8) not null default 0
    check (estimated_cost_usd >= 0),

  question_counted boolean not null default true,

  created_at timestamptz not null default now()
);

create index if not exists
  ai_usage_user_created_idx
on public.ai_usage(user_id, created_at desc);

create index if not exists
  ai_usage_plan_created_idx
on public.ai_usage(plan_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Users may read active plans and their own subscription/usage.
-- Only the trusted Flask backend may insert or update subscription data.
-- ---------------------------------------------------------------------------

alter table public.ai_plans
  enable row level security;

alter table public.ai_subscriptions
  enable row level security;

alter table public.ai_usage
  enable row level security;

drop policy if exists
  "Anyone can read active AI plans"
on public.ai_plans;

create policy
  "Anyone can read active AI plans"
on public.ai_plans
for select
to anon, authenticated
using (active = true);

drop policy if exists
  "Users can read their own AI subscription"
on public.ai_subscriptions;

create policy
  "Users can read their own AI subscription"
on public.ai_subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists
  "Users can read their own AI usage"
on public.ai_usage;

create policy
  "Users can read their own AI usage"
on public.ai_usage
for select
to authenticated
using (auth.uid() = user_id);

grant select
on public.ai_plans
to anon, authenticated;

grant select
on public.ai_subscriptions
to authenticated;

grant select
on public.ai_usage
to authenticated;

commit;
