// Run after fetching the stability branch. Uses disposable in-memory Postgres only.
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
async function run() {
  const db = new PGlite();
  try {
    const walletFile='scripts/staging-wallet-hardening-phase2.sql';
    const wallet=existsSync(walletFile)?readFileSync(walletFile,'utf8'):
      execFileSync('git',['show','c163ccd7f2b646317ad59f774868282d4e34c06c:'+walletFile],{encoding:'utf8'});
    const a=randomUUID(), b=randomUUID();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select current_setting('test.account')::uuid$$;
      create function auth.jwt() returns jsonb language sql as $$select current_setting('test.claims')::jsonb$$;
      create table public.profiles(id uuid primary key,coins bigint,island_xp integer,island_level integer,updated_at timestamptz);
      insert into auth.users values ('${a}'),('${b}');
      insert into profiles values('${a}',98,148,1,now()),('${b}',12,14,2,now());
    `);
    await db.exec(wallet.slice(wallet.indexOf('create table public.transactions'),wallet.indexOf('-- Service-only; backend')));
    await db.exec(readFileSync('scripts/staging-adaptive-island.sql','utf8'));
    const login=async (id,anonymous=false)=> db.exec(`reset role; set role authenticated; set test.account='${id}'; set test.claims='{"is_anonymous":${anonymous}}'`);
    const begin=async lesson=>(await db.query('select nova_garden_begin($1) as r',[lesson])).rows[0].r;
    const answer=async(id,number)=>(await db.query('select nova_garden_answer($1,$2) as r',[id,number])).rows[0].r;
    await login(a);
    assert.equal((await begin('music-octave')).status,'closed');
    await assert.rejects(db.query('select * from nova_garden_private.checks'));
    await db.exec("reset role; update nova_garden_private.settings set enabled=true; set role anon");
    await assert.rejects(begin('music-octave'));
    await login(a,true);assert.equal((await begin('music-octave')).status,'closed');
    await login(a);assert.equal((await begin('made-up')).status,'unavailable');
    const q=await begin('music-octave');assert.equal(q.status,'question');
    assert.equal((await begin('music-octave')).attempt,q.attempt);
    const solution=Number(q.prompt.match(/\d+/)[0])*2;
    await login(b);assert.equal((await answer(q.attempt,solution)).status,'unavailable');
    await login(a);
    const results=await Promise.all([answer(q.attempt,solution),answer(q.attempt,solution)]);
    const win=results.find(x=>x.status==='credited');
    assert.deepEqual([win.balance,win.island_level,win.island_xp,win.xp,win.coins],[103,2,2,4,5]);
    assert.ok(results.some(x=>x.status==='already_credited'));
    assert.equal((await begin('music-octave')).status,'already_credited');
    const art=await begin('art-depth');assert.equal((await answer(art.attempt,-1)).status,'incorrect');
    assert.equal((await answer(art.attempt,0)).status,'incorrect');
    assert.equal((await begin('space-light')).status,'daily_limit');
    await login(b);const space=await begin('space-light');
    await db.exec("reset role; update nova_garden_private.checks set expires_at=now()-interval '1 minute' where id='"+space.attempt+"'");
    await login(b);assert.equal((await answer(space.attempt,10)).status,'expired');
    await db.exec('reset role');
    assert.equal((await db.query('select count(*)::int n from transactions')).rows[0].n,1);
    const untouched=(await db.query('select coins::int,island_xp,island_level from profiles where id=$1',[b])).rows[0];
    assert.deepEqual(untouched,{coins:12,island_xp:14,island_level:2});
    console.log('PASS closed default, authenticated role isolation, private tables, eligible lesson, resume, correct and wrong answers, atomic XP rollover with existing wallet, replay, daily cap and expiration.');
  } finally { await db.close(); }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
