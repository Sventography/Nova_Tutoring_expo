-- Staging regression only. Requires phase 3 and empty fixture IDs.
-- Rolls back all users, questions, attempts, ledger and wallet changes.
begin;
insert into auth.users(id,aud,role,email) values
 ('a2b13000-0000-4000-8000-000000000001','authenticated','authenticated','quiz-fixture-a@example.invalid'),
 ('a2b13000-0000-4000-8000-000000000002','authenticated','authenticated','quiz-fixture-b@example.invalid');
insert into public.profiles(id,username,coins) values
 ('a2b13000-0000-4000-8000-000000000001','quiz-fixture-a',0),
 ('a2b13000-0000-4000-8000-000000000002','quiz-fixture-b',0);
insert into public.nova_verified_quiz_bank(topic_id,prompt,choices,correct_index,enabled)
select 'fixture_math','Fixture '||n,array['right','wrong1','wrong2','wrong3'],1,true from generate_series(1,20)n;
set local role service_role;
do $$ declare a uuid:='a2b13000-0000-4000-8000-000000000001'; b uuid:='a2b13000-0000-4000-8000-000000000002'; t uuid; q uuid; idx integer; v jsonb; replay jsonb; n integer; begin
 v:=public.nova_begin_verified_quiz(a,'unapproved',gen_random_uuid()); if v->>'status'<>'unavailable' then raise exception 'unknown topic allowed'; end if;
 v:=public.nova_begin_verified_quiz(a,'fixture_math','a2b13000-0000-4000-8000-000000000003'); if v->>'status'<>'question' or v ? 'correct_index' or v ? 'bank_id' then raise exception 'bad issue response %',v; end if;
 t:=(v->>'attempt_id')::uuid; q:=(v->>'question_id')::uuid;
 replay:=public.nova_begin_verified_quiz(a,'fixture_math','a2b13000-0000-4000-8000-000000000003'); if replay<>v then raise exception 'start replay changed'; end if;
 if public.nova_begin_verified_quiz(a,'fixture_math',gen_random_uuid())->>'status'<>'active_attempt' then raise exception 'parallel start allowed'; end if;
 if public.nova_claim_quiz_reward(b,t,q,1)->>'status'<>'unavailable' then raise exception 'cross-account answer allowed'; end if;
 select id into q from public.nova_verified_quiz_questions where attempt_id=t and step=2;
 if public.nova_claim_quiz_reward(a,t,q,1)->>'status'<>'stale' then raise exception 'future answer accepted'; end if;
 for n in 1..20 loop
  select id,correct_index into q,idx from public.nova_verified_quiz_questions where attempt_id=t and step=n;
  v:=public.nova_claim_quiz_reward(a,t,q,idx);
  if v->>'status'<>'answered' or v->>'correct'<>'true' or v->>'coins_awarded'<>'5' then raise exception 'correct answer failed %',v; end if;
  replay:=public.nova_claim_quiz_reward(a,t,q,idx); if replay->>'status'<>'duplicate' or replay->>'coins_awarded'<>'0' then raise exception 'double reward'; end if;
  if public.nova_claim_quiz_reward(a,t,q,(idx%4)+1)->>'status'<>'stale' then raise exception 'answer changed after submission'; end if;
 end loop;
 if v->>'perfect_bonus'<>'50' or v->>'balance'<>'150' or v->'next'->>'status'<>'complete' then raise exception 'perfect award failed %',v; end if;
 v:=public.nova_begin_verified_quiz(a,'fixture_math',gen_random_uuid()); t:=(v->>'attempt_id')::uuid;
 for n in 1..20 loop
  select id,correct_index into q,idx from public.nova_verified_quiz_questions where attempt_id=t and step=n;
  v:=public.nova_claim_quiz_reward(a,t,q,idx);
  if v->>'coins_awarded'<>'0' or v->>'perfect_bonus'<>'0' or v->>'balance'<>'150' then raise exception 'repeat topic farm allowed'; end if;
 end loop;
 v:=public.nova_begin_verified_quiz(b,'fixture_math',gen_random_uuid()); t:=(v->>'attempt_id')::uuid;
 select id,correct_index into q,idx from public.nova_verified_quiz_questions where attempt_id=t and step=1;
 v:=public.nova_claim_quiz_reward(b,t,q,(idx%4)+1);
 if v->>'correct'<>'false' or v->>'coins_awarded'<>'0' or v->>'balance'<>'0' then raise exception 'wrong answer paid'; end if;
 update public.nova_verified_quiz_attempts set expires_at=now()-interval '1 second' where id=t;
 select id into q from public.nova_verified_quiz_questions where attempt_id=t and step=2;
 if public.nova_claim_quiz_reward(b,t,q,1)->>'status'<>'expired' then raise exception 'expired attempt accepted'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a2b13000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
do $$ begin
 begin perform public.nova_claim_quiz_reward(auth.uid(),gen_random_uuid(),gen_random_uuid(),1); raise exception 'client claim allowed'; exception when insufficient_privilege then null; end;
 begin perform correct_index from public.nova_verified_quiz_bank; raise exception 'answer bank exposed'; exception when insufficient_privilege then null; end;
 if (select count(*) from public.transactions)<>21 or (select sum(amount) from public.transactions)<>150 then raise exception 'ledger mismatch'; end if;
end $$;
reset role;
select 'verified quiz fixture checks passed' as result;
rollback;
