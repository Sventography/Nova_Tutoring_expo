-- ============================================================================
-- Nova Tutoring v1.3
-- App Store Server Notifications V2
--
-- Adds:
-- - Apple's renewal / scheduled-plan metadata to ai_subscriptions
-- - An idempotent server-notification audit table
--
-- The signed Apple payload itself is NOT stored.
-- We keep only useful verified metadata + a SHA-256 fingerprint.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Extend the authoritative Nova AI subscription row.
-- ---------------------------------------------------------------------------

alter table public.ai_subscriptions
  add column if not exists environment text,
  add column if not exists auto_renew_product_id text,
  add column if not exists auto_renew_status boolean,
  add column if not exists renewal_date timestamptz,
  add column if not exists grace_period_end timestamptz,
  add column if not exists expiration_intent integer,

  add column if not exists last_notification_uuid text,
  add column if not exists last_notification_type text,
  add column if not exists last_notification_subtype text,
  add column if not exists last_notification_signed_at timestamptz;


create index if not exists
  ai_subscriptions_auto_renew_product_idx
on public.ai_subscriptions (
  auto_renew_product_id
);


create index if not exists
  ai_subscriptions_last_notification_signed_idx
on public.ai_subscriptions (
  last_notification_signed_at desc
);


-- ---------------------------------------------------------------------------
-- 2. Apple notification history.
--
-- notification_uuid gives us idempotency when Apple retries.
-- We deliberately DO NOT store signedPayload.
-- ---------------------------------------------------------------------------

create table if not exists public.apple_subscription_notifications (
  notification_uuid text primary key,

  notification_type text not null,
  subtype text,
  environment text,

  signed_at timestamptz,

  user_id uuid
    references auth.users(id)
    on delete set null,

  original_transaction_id text,
  transaction_id text,

  product_id text,
  auto_renew_product_id text,

  status text,

  payload_sha256 text not null,

  ignored boolean
    not null
    default false,

  processing_error text,

  received_at timestamptz
    not null
    default now(),

  processed_at timestamptz,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


create index if not exists
  apple_subscription_notifications_user_idx
on public.apple_subscription_notifications (
  user_id,
  received_at desc
);


create index if not exists
  apple_subscription_notifications_original_tx_idx
on public.apple_subscription_notifications (
  original_transaction_id,
  received_at desc
);


create index if not exists
  apple_subscription_notifications_type_idx
on public.apple_subscription_notifications (
  notification_type,
  received_at desc
);


-- ---------------------------------------------------------------------------
-- 3. Reuse Nova's existing updated_at trigger helper.
-- ---------------------------------------------------------------------------

drop trigger if exists
  apple_subscription_notifications_set_updated_at
on public.apple_subscription_notifications;


create trigger
  apple_subscription_notifications_set_updated_at
before update
on public.apple_subscription_notifications
for each row
execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 4. Backend-only notification history.
--
-- The mobile app does not need direct access to these rows.
-- ---------------------------------------------------------------------------

alter table public.apple_subscription_notifications
  enable row level security;


revoke all
on public.apple_subscription_notifications
from anon, authenticated;


grant select, insert, update
on public.apple_subscription_notifications
to service_role;


commit;
