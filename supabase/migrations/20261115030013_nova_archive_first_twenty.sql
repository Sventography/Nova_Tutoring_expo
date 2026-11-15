begin;

create table public.nova_archive_completions (
  finish_number integer primary key check (finish_number > 0),
  user_id uuid unique references auth.users(id) on delete set null,
  completed_at timestamptz not null default now()
);

alter table public.nova_archive_completions enable row level security;
revoke all on public.nova_archive_completions from public, anon, authenticated;
grant select, insert on public.nova_archive_completions to service_role;

-- A single transaction orders completions, grants a wallet reward once, and
-- records permanent badge/Star entitlement for finish numbers 1 through 20.
-- A deleted account leaves its finish number occupied.
create function public.nova_complete_archive(p_user_id uuid)
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
