-- ============================================================================
-- Nova Tutoring v1.3
-- Nova AI rolling-memory compaction
--
-- Full entitled conversation memory continues to live in ask_messages.
-- This table stores only a compact server-generated summary used to avoid
-- resending hundreds of old messages to OpenAI on every question.
-- ============================================================================

begin;


-- ---------------------------------------------------------------------------
-- 1. One compact memory snapshot per registered Nova user.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_memory_summaries (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  summary text not null
    default '',

  -- Memory allowance against which this summary was built.
  -- If a user changes plans / memory entitlement, the backend rebuilds it.
  source_memory_limit integer not null
    default 0
    check (source_memory_limit >= 0),

  -- Number of raw messages represented by the summary at its last rebuild.
  summarized_message_count integer not null
    default 0
    check (summarized_message_count >= 0),

  -- Newest ask_messages row that existed when the compact snapshot was built.
  -- Used to decide when enough new conversation has accumulated to rebuild.
  last_compacted_message_at timestamptz,

  -- Model that produced the compact summary.
  -- This is informational only; it does not grant any entitlement.
  model text,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


comment on table public.ai_memory_summaries is
  'Server-generated compact Nova AI conversation memory. Raw entitled memory remains in ask_messages.';


comment on column public.ai_memory_summaries.source_memory_limit is
  'Effective message-memory entitlement when this compact summary was built.';


comment on column public.ai_memory_summaries.last_compacted_message_at is
  'Newest raw Ask message present when the rolling summary snapshot was rebuilt.';


-- ---------------------------------------------------------------------------
-- 2. Useful maintenance index.
-- ---------------------------------------------------------------------------

create index if not exists
  ai_memory_summaries_updated_idx
on public.ai_memory_summaries (
  updated_at desc
);


-- ---------------------------------------------------------------------------
-- 3. Automatic updated_at.
-- ---------------------------------------------------------------------------

drop trigger if exists
  ai_memory_summaries_set_updated_at
on public.ai_memory_summaries;


create trigger
  ai_memory_summaries_set_updated_at
before update
on public.ai_memory_summaries
for each row
execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 4. Backend only.
--
-- The mobile app should never create or edit AI-generated memory summaries.
-- Flask uses the service-role key and bypasses RLS.
-- ---------------------------------------------------------------------------

alter table public.ai_memory_summaries
  enable row level security;


revoke all
on public.ai_memory_summaries
from anon, authenticated;


grant select, insert, update, delete
on public.ai_memory_summaries
to service_role;


commit;
