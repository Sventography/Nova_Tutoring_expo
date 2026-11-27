'use strict';

// Execute the checked-in staging fixture without credentials or a database URL.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const { join } = require('node:path');

async function run() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, aud text, role text, email text);
      create function auth.jwt() returns jsonb language sql stable as $$
        select nullif(current_setting('request.jwt.claims', true),'')::jsonb
      $$;
      create function auth.uid() returns uuid language sql stable as $$
        select (auth.jwt()->>'sub')::uuid
      $$;
      grant usage on schema auth to authenticated, service_role;
      create table public.profiles(id uuid primary key references auth.users, username text,
        coins bigint, updated_at timestamptz, purchases jsonb);
      grant select, update on public.profiles to service_role;
    `);
    for (const file of ['staging-wallet-hardening-phase2.sql','staging-wallet-hardening-phase3.sql',
      'test-staging-verified-quiz.sql']) {
      await db.exec(readFileSync(join(__dirname,file),'utf8'));
    }
    assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,0);
    // Exercise the real wallet RPC with test accounts and catalog entries.
    const buyer = '00000000-0000-4000-8000-000000000001';
    const other = '00000000-0000-4000-8000-000000000002';
    await db.exec(`
      insert into auth.users(id) values ('${buyer}'), ('${other}');
      insert into profiles(id,coins) values ('${buyer}',50), ('${other}',8);
      insert into nova_wallet_catalog values ('fixture-book',20,true), ('inactive-book',1,false);
      set role service_role;
    `);
    const buy = async (owner,item) =>
      (await db.query('select nova_wallet_buy($1,$2) as result',[owner,item])).rows[0].result;
    assert.equal((await buy(buyer,'inactive-book')).status,'unavailable');
    assert.equal((await buy(other,'fixture-book')).status,'insufficient');
    assert.equal((await buy(buyer,'fixture-book')).balance,30);
    assert.equal((await buy(buyer,'fixture-book')).status,'owned');
    await db.exec(`reset role;set role authenticated;
      select set_config('request.jwt.claims','{"sub":"${other}","role":"authenticated"}',false);`);
    assert.equal((await db.query('select * from purchases')).rows.length,0);
    assert.equal((await db.query('select * from transactions')).rows.length,0);
    await db.exec('reset role');
    assert.deepEqual((await db.query('select kind, amount::int from transactions')).rows,
      [{kind:'coin_shop',amount:-20}]);
    assert.deepEqual((await db.query('select coins::int from profiles order by id')).rows,
      [{coins:30},{coins:8}]);
    console.log('PASS verified quiz, access, fixture rollback; Nova Coins purchase, ownership replay, private history and insufficient balance.');
  } finally { await db.close(); }
}
run().catch(error => { console.error(error.message);process.exitCode=1; });
