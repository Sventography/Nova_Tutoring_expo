'use strict';

// This test creates its own in-memory Postgres instance. It takes no database URL.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

async function run() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      grant usage on schema auth to authenticated;
      create table public.profiles(id uuid primary key references auth.users, coins integer, updated_at timestamptz);
      grant select, update on public.profiles to service_role;
    `);
    for (const name of ['20261115030013_nova_archive_first_twenty.sql', '20261118120000_read_own_archive_award.sql']) {
      await db.exec(readFileSync(path.join(__dirname, '../supabase/migrations', name), 'utf8'));
    }
    const players = Array.from({ length: 22 }, () => randomUUID());
    for (const [index, id] of players.entries()) {
      await db.query('insert into auth.users values ($1)', [id]);
      if (index < 21) await db.query('insert into public.profiles values ($1, 7, now())', [id]);
    }
    const claim = async id => (await db.query('select public.nova_complete_archive($1) as status', [id])).rows[0].status;

    await db.exec('set role service_role');
    await assert.rejects(() => claim(players[21]), /requires a profile/);
    for (const [index, id] of players.slice(0, 21).entries()) {
      assert.equal(await claim(id), index < 20 ? 'awarded' : 'completed');
      assert.equal(await claim(id), index < 20 ? 'already_awarded' : 'completed');
      const { rows } = await db.query('select coins from public.profiles where id = $1', [id]);
      assert.equal(rows[0].coins, index < 20 ? 25007 : 7);
    }
    await db.exec('reset role; set role authenticated');
    const awards = async id => {
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      return (await db.query('select user_id, finish_number, completed_at from public.nova_archive_completions')).rows;
    };
    const twentieth = await awards(players[19]);
    assert.equal(twentieth.length, 1);
    assert.equal(twentieth[0].user_id, players[19]);
    assert.equal(twentieth[0].finish_number, 20);
    assert.ok(twentieth[0].completed_at);
    assert.deepEqual(await awards(players[20]), []);
    assert.deepEqual(await awards(players[21]), []);
    const { rows } = await db.query("select has_function_privilege('public.nova_complete_archive(uuid)', 'execute') as can_issue");
    assert.equal(rows[0].can_issue, false);
    await db.exec('reset role; set role anon');
    const guest = await db.query("select has_column_privilege('public.nova_archive_completions', 'user_id', 'select') as can_read");
    assert.equal(guest.rows[0].can_read, false);
    console.log('PASS: 20 unique credits of 25,000 Nova Coins, no duplicate credit on replay, finisher 21 completes, private award receipts, and missing-profile rollback.');
  } finally {
    await db.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
