-- STAGING ONLY. No questions or public reward endpoint enabled by this file.
-- Trusted API must authenticate the registered account and derive p_user_id
-- from the verified token, not the request body. Do not restore legacy
-- (topic, kind, event key) claims: they accepted client-asserted correctness.
create table public.nova_verified_quiz_bank (
 id uuid primary key default gen_random_uuid(),
 topic_id text not null check(topic_id ~ '^[a-z0-9_-]{1,100}$'),
 prompt text not null check(length(prompt) between 1 and 2000),
 choices text[] not null check(cardinality(choices)=4 and array_lower(choices,1)=1),
 correct_index integer not null check(correct_index between 1 and 4),
 enabled boolean not null default false,
 check(array_position(choices,null) is null),
 check(choices[1]<>choices[2] and choices[1]<>choices[3] and choices[1]<>choices[4] and choices[2]<>choices[3] and choices[2]<>choices[4] and choices[3]<>choices[4])
);
create table public.nova_verified_quiz_attempts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 topic_id text not null,
 day_key date not null,
 expires_at timestamptz not null,
 status text not null default 'active' check(status in ('active','complete','expired')),
 next_step integer not null default 1 check(next_step between 1 and 21),
 correct_count integer not null default 0 check(correct_count between 0 and 20),
 credited_count integer not null default 0 check(credited_count between 0 and 20),
 unique(user_id,request_id)
);
create unique index nova_verified_quiz_one_active on public.nova_verified_quiz_attempts(user_id) where status='active';
create index nova_verified_quiz_attempt_day on public.nova_verified_quiz_attempts(user_id,day_key);
create table public.nova_verified_quiz_questions (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.nova_verified_quiz_attempts(id) on delete cascade,
 step integer not null check(step between 1 and 20),
 bank_id uuid not null references public.nova_verified_quiz_bank(id),
 prompt text not null,
 choices text[] not null,
 correct_index integer not null check(correct_index between 1 and 4),
 chosen_index integer check(chosen_index between 1 and 4),
 coins_awarded integer not null default 0 check(coins_awarded in (0,5)),
 unique(attempt_id,step), unique(attempt_id,bank_id)
);
create table public.nova_verified_quiz_credits (
 user_id uuid not null references auth.users(id) on delete cascade,
 day_key date not null,
 topic_id text not null,
 bank_id uuid not null references public.nova_verified_quiz_bank(id),
 primary key(user_id,day_key,bank_id)
);
create index nova_verified_quiz_credits_topic on public.nova_verified_quiz_credits(user_id,day_key,topic_id);
create table public.nova_verified_quiz_perfect (
 user_id uuid not null references auth.users(id) on delete cascade,
 day_key date not null,
 topic_id text not null,
 attempt_id uuid not null unique references public.nova_verified_quiz_attempts(id) on delete cascade,
 primary key(user_id,day_key,topic_id)
);
alter table public.nova_verified_quiz_bank enable row level security;
alter table public.nova_verified_quiz_attempts enable row level security;
alter table public.nova_verified_quiz_questions enable row level security;
alter table public.nova_verified_quiz_credits enable row level security;
alter table public.nova_verified_quiz_perfect enable row level security;
revoke all on public.nova_verified_quiz_bank,public.nova_verified_quiz_attempts,public.nova_verified_quiz_questions,public.nova_verified_quiz_credits,public.nova_verified_quiz_perfect from public,anon,authenticated,service_role;
grant select on public.nova_verified_quiz_bank to service_role;
grant select,insert,update on public.nova_verified_quiz_attempts,public.nova_verified_quiz_questions to service_role;
grant select,insert on public.nova_verified_quiz_credits,public.nova_verified_quiz_perfect to service_role;

-- Response allowlist: never send correct_index, bank_id, or future questions.
create function public.nova_quiz_current(p_user_id uuid,p_attempt_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.nova_verified_quiz_attempts%rowtype; q public.nova_verified_quiz_questions%rowtype;
begin
 select * into a from public.nova_verified_quiz_attempts where id=p_attempt_id and user_id=p_user_id;
 if not found then return jsonb_build_object('status','unavailable'); end if;
 if a.status='complete' then return jsonb_build_object('status','complete','attempt_id',a.id,'correct_count',a.correct_count,'total',20); end if;
 if a.status<>'active' or a.expires_at<=now() or a.day_key<>timezone('America/New_York',now())::date then return jsonb_build_object('status','expired'); end if;
 select * into strict q from public.nova_verified_quiz_questions where attempt_id=a.id and step=a.next_step;
 return jsonb_build_object('status','question','attempt_id',a.id,'topic_id',a.topic_id,'question_id',q.id,'step',a.next_step,'total',20,'prompt',q.prompt,'choices',q.choices);
end; $$;
revoke all on function public.nova_quiz_current(uuid,uuid) from public,anon,authenticated;
grant execute on function public.nova_quiz_current(uuid,uuid) to service_role;

create function public.nova_begin_verified_quiz(p_user_id uuid,p_topic_id text,p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.nova_verified_quiz_attempts%rowtype; v_day date:=timezone('America/New_York',now())::date; v_count bigint;
begin
 if p_user_id is null or p_request_id is null or p_topic_id is null or p_topic_id !~ '^[a-z0-9_-]{1,100}$' then return jsonb_build_object('status','invalid'); end if;
 perform 1 from public.profiles where id=p_user_id for update;
 if not found then return jsonb_build_object('status','unavailable'); end if;
 select * into a from public.nova_verified_quiz_attempts where user_id=p_user_id and request_id=p_request_id;
 if found then
  if a.topic_id<>p_topic_id then return jsonb_build_object('status','invalid'); end if;
  return public.nova_quiz_current(p_user_id,a.id);
 end if;
 update public.nova_verified_quiz_attempts set status='expired' where user_id=p_user_id and status='active' and (expires_at<=now() or day_key<>v_day);
 select * into a from public.nova_verified_quiz_attempts where user_id=p_user_id and status='active';
 if found then return jsonb_build_object('status','active_attempt','attempt_id',a.id,'topic_id',a.topic_id); end if;
 select count(*) into v_count from public.nova_verified_quiz_attempts where user_id=p_user_id and day_key=v_day;
 if v_count>=20 then return jsonb_build_object('status','attempt_limit'); end if;
 select count(*) into v_count from public.nova_verified_quiz_bank where topic_id=p_topic_id and enabled;
 if v_count<20 then return jsonb_build_object('status','unavailable'); end if;
 insert into public.nova_verified_quiz_attempts(user_id,request_id,topic_id,day_key,expires_at)
 values(p_user_id,p_request_id,p_topic_id,v_day,now()+interval '45 minutes') returning * into a;
 insert into public.nova_verified_quiz_questions(attempt_id,step,bank_id,prompt,choices,correct_index)
 select a.id,row_number() over(order by s.sort_order)::integer,s.id,s.prompt,c.shuffled,array_position(c.shuffled,s.choices[s.correct_index])
 from (select b.*,random() as sort_order from public.nova_verified_quiz_bank b where b.topic_id=p_topic_id and b.enabled order by sort_order limit 20) s
 cross join lateral (select array_agg(opt order by random()) as shuffled from unnest(s.choices) opt) c;
 return public.nova_quiz_current(p_user_id,a.id);
end; $$;
revoke all on function public.nova_begin_verified_quiz(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.nova_begin_verified_quiz(uuid,text,uuid) to service_role;

-- New, incompatible signature deliberately rejects legacy client claims.
create function public.nova_claim_quiz_reward(p_user_id uuid,p_attempt_id uuid,p_question_id uuid,p_choice integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.nova_verified_quiz_attempts%rowtype; q public.nova_verified_quiz_questions%rowtype;
 v_correct boolean; v_coins integer:=0; v_perfect integer:=0; v_count bigint; v_topic_count bigint; v_receipt jsonb; v_balance bigint;
begin
 if p_user_id is null or p_attempt_id is null or p_question_id is null or p_choice is null or p_choice not between 1 and 4 then return jsonb_build_object('status','invalid'); end if;
 select coalesce(coins,0) into v_balance from public.profiles where id=p_user_id for update;
 if not found then return jsonb_build_object('status','unavailable'); end if;
 select * into a from public.nova_verified_quiz_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then return jsonb_build_object('status','unavailable'); end if;
 if a.status='expired' or a.expires_at<=now() or a.day_key<>timezone('America/New_York',now())::date then return jsonb_build_object('status','expired'); end if;
 select * into q from public.nova_verified_quiz_questions where attempt_id=a.id and id=p_question_id;
 if not found then return jsonb_build_object('status','stale'); end if;
 if q.chosen_index is not null then
  if q.chosen_index<>p_choice then return jsonb_build_object('status','stale'); end if;
  return jsonb_build_object('status','duplicate','correct',q.chosen_index=q.correct_index,'coins_awarded',0,'balance',v_balance,'next',public.nova_quiz_current(p_user_id,a.id));
 end if;
 if a.status<>'active' or q.step<>a.next_step then return jsonb_build_object('status','stale'); end if;
 v_correct:=p_choice=q.correct_index;
 if v_correct then
  select count(*) into v_count from public.nova_verified_quiz_credits where user_id=p_user_id and day_key=a.day_key;
  select count(*) into v_topic_count from public.nova_verified_quiz_credits where user_id=p_user_id and day_key=a.day_key and topic_id=a.topic_id;
  if v_count<100 and v_topic_count<20 then
   insert into public.nova_verified_quiz_credits(user_id,day_key,topic_id,bank_id) values(p_user_id,a.day_key,a.topic_id,q.bank_id) on conflict do nothing;
   if found then
    v_receipt:=public.nova_wallet_record(p_user_id,'verified_quiz:'||q.id::text,'verified_quiz',5);
    if v_receipt->>'status'<>'applied' then raise exception 'Quiz ledger inconsistency'; end if;
    v_coins:=5; v_balance:=(v_receipt->>'balance')::bigint;
   end if;
  end if;
 end if;
 update public.nova_verified_quiz_questions set chosen_index=p_choice,coins_awarded=v_coins where id=q.id;
 update public.nova_verified_quiz_attempts set next_step=next_step+1,correct_count=correct_count+case when v_correct then 1 else 0 end,credited_count=credited_count+case when v_coins>0 then 1 else 0 end,status=case when next_step=20 then 'complete' else 'active' end where id=a.id returning * into a;
 if a.status='complete' and a.correct_count=20 and a.credited_count=20 then
  select count(*) into v_count from public.nova_verified_quiz_perfect where user_id=p_user_id and day_key=a.day_key;
  if v_count<5 then
   insert into public.nova_verified_quiz_perfect(user_id,day_key,topic_id,attempt_id) values(p_user_id,a.day_key,a.topic_id,a.id) on conflict do nothing;
   if found then
    v_receipt:=public.nova_wallet_record(p_user_id,'verified_quiz_perfect:'||a.id::text,'verified_quiz',50);
    if v_receipt->>'status'<>'applied' then raise exception 'Perfect quiz ledger inconsistency'; end if;
    v_perfect:=50; v_balance:=(v_receipt->>'balance')::bigint;
   end if;
  end if;
 end if;
 return jsonb_build_object('status','answered','correct',v_correct,'coins_awarded',v_coins,'perfect_bonus',v_perfect,'balance',v_balance,'next',public.nova_quiz_current(p_user_id,a.id));
end; $$;
revoke all on function public.nova_claim_quiz_reward(uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.nova_claim_quiz_reward(uuid,uuid,uuid,integer) to service_role;
