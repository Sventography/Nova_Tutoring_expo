-- Staging-only hardening phase 1. Do not run on production until every legacy
-- wallet and entitlement writer has been replaced and verified.
revoke insert, update, delete on public.profiles from public, anon, authenticated;
revoke insert (coins,purchases,ask_memory_tier,ask_memory_limit,island_xp,island_level,companion_shield_charges,companion_hint_tokens), update (coins,purchases,ask_memory_tier,ask_memory_limit,island_xp,island_level,companion_shield_charges,companion_hint_tokens) on public.profiles from public, anon, authenticated;
grant insert (id,username,contact_email,avatar_url,ask_personality,updated_at,avatar_key) on public.profiles to authenticated;
grant update (username,contact_email,avatar_url,ask_personality,updated_at,avatar_key) on public.profiles to authenticated;
create table if not exists public.nova_daily_login_claims (
 user_id uuid not null references auth.users(id) on delete cascade,
 day_key date not null,
 coins_awarded integer not null check(coins_awarded in (5,20)),
 primary key(user_id,day_key)
);
alter table public.nova_daily_login_claims enable row level security;
revoke all on public.nova_daily_login_claims from public,anon,authenticated;
create or replace function public.nova_claim_daily_login()
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_uid uuid := auth.uid();
 v_day date := (pg_catalog.timezone('America/New_York',pg_catalog.now()))::date;
 v_count bigint;
 v_amount integer;
 v_balance bigint;
begin
 if v_uid is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'Registered account required' using errcode='42501'; end if;
 select coalesce(p.coins,0) into v_balance from public.profiles p where p.id=v_uid for update;
 if not found then raise exception 'Profile required'; end if;
 select c.coins_awarded into v_amount from public.nova_daily_login_claims c where c.user_id=v_uid and c.day_key=v_day;
 if found then return jsonb_build_object('awarded',false,'coins_awarded',0,'balance',v_balance); end if;
 select count(*) into v_count from public.nova_daily_login_claims c where c.user_id=v_uid;
 v_amount := case when (v_count+1)%7=0 then 20 else 5 end;
 insert into public.nova_daily_login_claims(user_id,day_key,coins_awarded) values(v_uid,v_day,v_amount);
 update public.profiles set coins=coalesce(coins,0)+v_amount,updated_at=now() where id=v_uid returning coins into v_balance;
 return jsonb_build_object('awarded',true,'coins_awarded',v_amount,'balance',v_balance);
end; $$;
revoke all on function public.nova_claim_daily_login() from public,anon,authenticated;
grant execute on function public.nova_claim_daily_login() to authenticated;
