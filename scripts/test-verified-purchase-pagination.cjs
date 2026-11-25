"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname,"../app/_lib/verifiedPurchasePagination.ts"),"utf8");
const shim = {exports:{}};
new Function("module","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(shim,shim.exports);
const {readAllVerifiedPurchases: read} = shim.exports;
async function run() {
  const item = i => ({item_id:"item:"+String(i).padStart(6,"0"),source:"coins"});
  const inventory = Array.from({length:1237},(_,i)=>item(i));
  let calls=0;
  const fetchPage = async (after,limit) => {
    calls++;
    assert.equal(limit,200);
    const start=after===null?0:inventory.findIndex(row=>row.item_id===after)+1;
    // Simulate a server cap smaller than our requested page.
    return inventory.slice(start,start+73);
  };
  assert.deepEqual(await read(fetchPage,()=>true),inventory);
  assert.equal(calls,Math.ceil(inventory.length/73)+1);
  assert.deepEqual(await read(async()=>[],()=>true),[]);
  const sources=[{item_id:"theme:neon",source:"coins"},{item_id:"cursor:orb",source:"verified_iap"},{item_id:"seventeenth_star",source:"verified_reward"}];
  assert.deepEqual(await read(async after=>after===null?sources:[],()=>true),sources);
  let n=0;
  await assert.rejects(read(async()=>{if(n++)throw Error("network");return [item(0)]},()=>true),/network/);
  await assert.rejects(read(async()=>[item(0)],()=>true),/repeated/);
  for(const malformed of [null,{},[null],[{item_id:"",source:"coins"}],[{item_id:"item",source:"local"}],[{item_id:"x".repeat(161),source:"coins"}],Array.from({length:201},(_,i)=>item(i))]) {
    await assert.rejects(read(async()=>malformed,()=>true),/Invalid/);
  }
  let current=true;
  await assert.rejects(read(async()=>{current=false;return [item(0)]},()=>current),/account changed/);
  let called=false;
  await assert.rejects(read(async()=>{called=true;return []},()=>false),/account changed/);
  assert.equal(called,false);
  let page=0;
  await assert.rejects(read(async()=>[item(page++)],()=>true),/page limit/);
  assert.equal(page,100);
  console.log("PASS: complete large collection, short server pages, empty collection, all sources, interruption, duplicates, malformed rows, account cancellation and bounded reads.");
}
run().catch(error=>{console.error(error);process.exitCode=1});
