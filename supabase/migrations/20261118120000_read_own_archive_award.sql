begin;

-- The app can display its signed-in player's permanent award. Only the backend
-- completion transaction can create or change the underlying record.
grant select (user_id, finish_number, completed_at)
  on public.nova_archive_completions to authenticated;

create policy "Players read their own First Twenty award"
  on public.nova_archive_completions for select to authenticated
  using (user_id = (select auth.uid()) and finish_number <= 20);

commit;
