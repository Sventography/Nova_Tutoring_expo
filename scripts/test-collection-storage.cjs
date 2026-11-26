"use strict";
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const src = readFileSync(path.join(__dirname, "../features/collections/store.ts"), "utf8");
const js = ts.transpileModule(src, {compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exported = {};
new Function("exports", js)(exported);
const { collectionKey, createCollectionStore } = exported;
const legacy = "@nova_collections_v1";
const topic = (id) => ({id, title:id, cards:[{id, front:id, back:id}]});

async function test() {
  const a = collectionKey(true, "A", "A");
  const b = collectionKey(true, "B", "B");
  const guest = collectionKey(true, null, null);
  assert.equal(collectionKey(false, null, null), null);
  assert.equal(collectionKey(true, "A", "B"), null);
  assert.equal(collectionKey(true, null, "A"), null);
  assert.notEqual(guest, collectionKey(true, "guest", "guest"));
  const map = new Map([[legacy, JSON.stringify([topic("unknown")])]]);
  let start, finish;
  const delayed = new Promise(r => {start = r;});
  const resume = new Promise(r => {finish = r;});
  const store = createCollectionStore({
    getItem: async k => { assert.notEqual(k,legacy); return map.get(k) ?? null; },
    setItem: async (k,v) => {
      assert.notEqual(k,legacy);
      if (k === a) {start(); await resume;}
      map.set(k,v);
    }
  });
  const append = id => topics => [...topics,topic(id)];
  const first = store.update(a,append("A1"));
  await delayed;
  const second = store.update(a,append("A2"));
  const returnToA = store.read(a);
  assert.deepEqual(await store.read(b),[]);
  await store.update(b,append("B1"));
  assert.deepEqual(await store.read(guest),[]);
  await store.update(guest,append("G1"));
  finish();
  await Promise.all([first,second]);
  assert.deepEqual(await returnToA,[topic("A1"),topic("A2")]);
  await store.update(b,() => []);
  assert.deepEqual(await store.read(a),[topic("A1"),topic("A2")]);
  assert.deepEqual(await store.read(guest),[topic("G1")]);
  map.set(b, '{"unexpected":true}');
  await assert.rejects(store.update(b,append("rejected")));
  assert.equal(map.get(b),'{"unexpected":true}');
  map.delete(b);
  await store.update(b,append("B2"));
  assert.deepEqual(await store.read(b),[topic("B2")]);
  assert.equal(map.get(legacy),JSON.stringify([topic("unknown")]));
  console.log("PASS Collections owner selection, account switch during a write, serial saves, guest isolation, failure recovery and untouched legacy data");
}
test().catch(error => { console.error(error); process.exitCode = 1; });
