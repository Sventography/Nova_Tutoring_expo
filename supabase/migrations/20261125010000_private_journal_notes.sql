begin;
-- Personal journals are private; no anonymous access or public sharing endpoints.
create table public.journal_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  title text not null check (char_length(title) <= 160),
  subject text not null default '' check (char_length(subject) <= 80),
  body text not null default '' check (char_length(body) <= 60000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.journal_notes enable row level security;
revoke all on public.journal_notes from public, anon, authenticated;
grant select, insert, update, delete on public.journal_notes to authenticated;
grant select, insert, update, delete on public.journal_notes to service_role;
create policy journal_select_own on public.journal_notes for select to authenticated using ((select auth.uid()) = user_id);
create policy journal_insert_own on public.journal_notes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy journal_update_own on public.journal_notes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy journal_delete_own on public.journal_notes for delete to authenticated using ((select auth.uid()) = user_id);
commit;
