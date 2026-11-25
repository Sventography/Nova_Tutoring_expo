-- STAGING ONLY. Do not install in production over legacy tables or balances.
-- No live catalog, checkout, payment or generic client-controlled award is enabled.
create table public.transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null unique check(length(event_key) between 1 and 240),
 amount bigint not null check(amount <> 0),
 kind text not null check(kind in ('daily_login','archive_first_twenty','coin_shop','verified_quiz','verified_iap','verified_reward')),
 balance_after bigint not null check(balance_after >= 0),
 created_at timestamptz not null default now()
);
create index transactions_owner_date_idx on public.transactions(user_id,created_at desc);
create table public.purchases (
 user_id uuid not null references auth.users(id) on delete cascade,
 item_id text not null check(length(item_id) between 1 and 160),
 source text not null check(source in ('coins','verified_iap','verified_reward')),
 transaction_id uuid unique references public.transactions(id),
 created_at timestamptz not null default now(),
 primary key(user_id,item_id)
);
create table public.nova_wallet_catalog (
 item_id text primary key check(length(item_id) between 1 and 160),
 coin_price bigint not null check(coin_price > 0),
 enabled boolean not null default false
);
alter table public.transactions enable row level security;
alter table public.purchases enable row level security;
alter table public.nova_wallet_catalog enable row level security;
revoke all on public.transactions,public.purchases,public.nova_wallet_catalog from public,anon,authenticated,service_role;
grant select on public.transactions,public.purchases to authenticated;
grant select,insert on public.transactions,public.purchases to service_role;
grant select on public.nova_wallet_catalog to service_role;
create policy wallet_transactions_owner_read on public.transactions for select to authenticated using(user_id=(select auth.uid()));
create policy wallet_purchases_owner_read on public.purchases for select to authenticated using(user_id=(select auth.uid()));

-- Only trusted server code (or an already-authorized definer function) can
-- execute this. Callers must validate the event before choosing its amount.
create function public.nova_wallet_record(p_user_id uuid,p_event_key text,p_kind text,p_amount bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_balance bigint; v_old public.transactions%rowtype; v_tx uuid;
begin
 if p_user_id is null or p_event_key is null or p_kind is null or p_amount is null or p_amount=0 then raise exception 'Invalid wallet event'; end if;
 select coalesce(coins,0) into v_balance from public.profiles where id=p_user_id for update;
 if not found then raise exception 'Profile required'; end if;
 select * into v_old from public.transactions where event_key=p_event_key;
 if found then
  if v_old.user_id<>p_user_id or v_old.kind<>p_kind or v_old.amount<>p_amount then raise exception 'Wallet event mismatch'; end if;
  return jsonb_build_object('status','duplicate','balance',v_balance,'transaction_id',v_old.id);
 end if;
 if v_balance+p_amount<0 then return jsonb_build_object('status','insufficient','balance',v_balance); end if;
 insert into public.transactions(user_id,event_key,kind,amount,balance_after)
 values(p_user_id,p_event_key,p_kind,p_amount,v_balance+p_amount) returning id into v_tx;
 update public.profiles set coins=v_balance+p_amount,updated_at=now() where id=p_user_id;
 return jsonb_build_object('status','applied','balance',v_balance+p_amount,'transaction_id',v_tx);
end; $$;
revoke all on function public.nova_wallet_record(uuid,text,text,bigint) from public,anon,authenticated;
grant execute on function public.nova_wallet_record(uuid,text,text,bigint) to service_role;

-- Service-only; backend must derive user from verified session, never body.
-- Price comes exclusively from a reviewed, enabled server catalog.
create function public.nova_wallet_buy(p_user_id uuid,p_item_id text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_price bigint; v_balance bigint; v_receipt jsonb;
begin
 if p_user_id is null or p_item_id is null then raise exception 'Invalid purchase'; end if;
 select coalesce(coins,0) into v_balance from public.profiles where id=p_user_id for update;
 if not found then raise exception 'Profile required'; end if;
 if exists(select 1 from public.purchases where user_id=p_user_id and item_id=p_item_id) then
  return jsonb_build_object('status','owned','balance',v_balance);
 end if;
 select coin_price into v_price from public.nova_wallet_catalog where item_id=p_item_id and enabled;
 if not found then return jsonb_build_object('status','unavailable','balance',v_balance); end if;
 v_receipt:=public.nova_wallet_record(p_user_id,'coin_shop:'||p_user_id::text||':'||p_item_id,'coin_shop',-v_price);
 if v_receipt->>'status'<>'applied' then return v_receipt; end if;
 insert into public.purchases(user_id,item_id,source,transaction_id)
 values(p_user_id,p_item_id,'coins',(v_receipt->>'transaction_id')::uuid);
 -- Compatibility mirror, derived from trusted records; never a client map.
 update public.profiles set purchases=coalesce(purchases,'{}'::jsonb)||jsonb_build_object(p_item_id,true),updated_at=now() where id=p_user_id;
 return v_receipt||jsonb_build_object('item_id',p_item_id);
end; $$;
revoke all on function public.nova_wallet_buy(uuid,text) from public,anon,authenticated;
grant execute on function public.nova_wallet_buy(uuid,text) to service_role;

create or replace function public.nova_claim_daily_login()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_day date:=(pg_catalog.timezone('America/New_York',pg_catalog.now()))::date; v_count bigint; v_amount integer; v_balance bigint; v_receipt jsonb;
begin
 if v_uid is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'Registered account required' using errcode='42501'; end if;
 select coalesce(coins,0) into v_balance from public.profiles where id=v_uid for update;
 if not found then raise exception 'Profile required'; end if;
 if exists(select 1 from public.nova_daily_login_claims where user_id=v_uid and day_key=v_day) then return jsonb_build_object('awarded',false,'coins_awarded',0,'balance',v_balance); end if;
 select count(*) into v_count from public.nova_daily_login_claims where user_id=v_uid;
 v_amount:=case when (v_count+1)%7=0 then 20 else 5 end;
 v_receipt:=public.nova_wallet_record(v_uid,'daily_login:'||v_uid::text||':'||v_day::text,'daily_login',v_amount);
 if v_receipt->>'status'<>'applied' then raise exception 'Daily ledger inconsistency'; end if;
 insert into public.nova_daily_login_claims(user_id,day_key,coins_awarded) values(v_uid,v_day,v_amount);
 return jsonb_build_object('awarded',true,'coins_awarded',v_amount,'balance',v_receipt->'balance');
end; $$;
revoke all on function public.nova_claim_daily_login() from public,anon,authenticated;
grant execute on function public.nova_claim_daily_login() to authenticated;

create or replace function public.nova_complete_archive(p_user_id uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare v_finish_number integer; v_receipt jsonb;
begin
 if p_user_id is null then raise exception 'Archive completion requires an account'; end if;
 perform pg_catalog.pg_advisory_xact_lock(17217,1);
 select finish_number into v_finish_number from public.nova_archive_completions where user_id=p_user_id;
 if found then return case when v_finish_number<=20 then 'already_awarded' else 'completed' end; end if;
 if not exists(select 1 from public.nova_archive_verification where user_id=p_user_id and verified_at is not null) then return 'unverified'; end if;
 if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'Archive completion requires a profile'; end if;
 select coalesce(max(finish_number),0)+1 into v_finish_number from public.nova_archive_completions;
 insert into public.nova_archive_completions(finish_number,user_id) values(v_finish_number,p_user_id);
 if v_finish_number>20 then return 'completed'; end if;
 v_receipt:=public.nova_wallet_record(p_user_id,'archive_first_twenty:'||p_user_id::text,'archive_first_twenty',25000);
 if v_receipt->>'status'<>'applied' then raise exception 'Archive ledger inconsistency'; end if;
 return 'awarded';
end; $$;
revoke all on function public.nova_complete_archive(uuid) from public,anon,authenticated;
grant execute on function public.nova_complete_archive(uuid) to service_role;
