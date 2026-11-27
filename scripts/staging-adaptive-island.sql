-- Isolated staging candidate. Requires the reviewed Phase 2 wallet and protected
-- profile columns. Installing this script leaves both RPCs closed.
begin;
create schema nova_garden_private;
revoke all on schema nova_garden_private from public, anon, authenticated;
create table nova_garden_private.settings (singleton boolean primary key check(singleton), enabled boolean not null);
insert into nova_garden_private.settings values(true,false);
create table nova_garden_private.checks (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 lesson text not null, et_day date not null, prompt text not null, answer integer not null,
 expires_at timestamptz not null, outcome text check(outcome in ('credited','incorrect')),
 unique(owner_id,lesson,et_day)
);
create unique index nova_garden_once on nova_garden_private.checks(owner_id,lesson) where outcome='credited';

create function public.nova_garden_begin(p_lesson text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); today date:=(now() at time zone 'America/New_York')::date;
 c nova_garden_private.checks%rowtype; n integer; question text; solution integer;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or
    (select enabled from nova_garden_private.settings where singleton) is not true then return jsonb_build_object('status','closed'); end if;
 perform 1 from public.profiles where id=uid for update;
 if not found then return jsonb_build_object('status','unavailable'); end if;
 if exists(select 1 from nova_garden_private.checks where owner_id=uid and lesson=p_lesson and outcome='credited') then
   return jsonb_build_object('status','already_credited'); end if;
 select * into c from nova_garden_private.checks where owner_id=uid and lesson=p_lesson and et_day=today;
 if found then
   if c.outcome is not null or c.expires_at<=now() then return jsonb_build_object('status','try_another_day'); end if;
 else
   if (select count(*) from nova_garden_private.checks where owner_id=uid and et_day=today)>=2 then
     return jsonb_build_object('status','daily_limit'); end if;
   n:=10+floor(random()*81)::integer;
   case p_lesson
    when 'music-octave' then question:=format('An oscillator plays at %s Hz. What frequency in Hz is one octave higher?',n); solution:=2*n;
    when 'space-light' then question:=format('A star is %s light-years away. How many years did the light reaching you today travel?',n); solution:=n;
    when 'art-depth' then question:=format('For a landscape study you scale a %s cm foreground sketch to one third of its width. How wide is the new sketch in cm?',3*n); solution:=n;
    else return jsonb_build_object('status','unavailable');
   end case;
   insert into nova_garden_private.checks(owner_id,lesson,et_day,prompt,answer,expires_at)
   values(uid,p_lesson,today,question,solution,now()+interval '15 minutes') returning * into c;
 end if;
 return jsonb_build_object('status','question','attempt',c.id,'prompt',c.prompt);
end $$;

create function public.nova_garden_answer(p_attempt uuid,p_answer integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); c nova_garden_private.checks%rowtype; receipt jsonb;
 lvl integer; xp integer; target bigint;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or
    (select enabled from nova_garden_private.settings where singleton) is not true then return jsonb_build_object('status','closed'); end if;
 select coalesce(island_xp,0),coalesce(island_level,1) into xp,lvl from public.profiles where id=uid for update;
 if not found then return jsonb_build_object('status','unavailable'); end if;
 select * into c from nova_garden_private.checks where id=p_attempt and owner_id=uid;
 if not found then return jsonb_build_object('status','unavailable'); end if;
 if c.outcome is not null then return jsonb_build_object('status',case when c.outcome='credited' then 'already_credited' else 'incorrect' end); end if;
 if c.expires_at<=now() or c.et_day<>(now() at time zone 'America/New_York')::date then return jsonb_build_object('status','expired'); end if;
 if p_answer is null then return jsonb_build_object('status','unavailable'); end if;
 if p_answer<>c.answer then
   update nova_garden_private.checks set outcome='incorrect' where id=c.id;
   return jsonb_build_object('status','incorrect');
 end if;
 target:=150+(lvl::bigint-1)*50;
 if lvl<1 or xp<0 or xp>=target then raise exception 'Invalid existing island progress'; end if;
 receipt:=public.nova_wallet_record(uid,'garden:'||uid::text||':'||c.lesson,'verified_reward',5::bigint);
 if receipt->>'status' is distinct from 'applied' then raise exception 'Inconsistent garden ledger'; end if;
 xp:=xp+4;
 if xp>=target then xp:=xp-target; lvl:=lvl+1; end if;
 update public.profiles set island_xp=xp,island_level=lvl where id=uid;
 update nova_garden_private.checks set outcome='credited' where id=c.id;
 return jsonb_build_object('status','credited','coins',5,'xp',4,'balance',receipt->'balance','island_level',lvl,'island_xp',xp);
end $$;
revoke all on function public.nova_garden_begin(text),public.nova_garden_answer(uuid,integer) from public,anon,authenticated;
grant execute on function public.nova_garden_begin(text),public.nova_garden_answer(uuid,integer) to authenticated;
commit;
