"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const provider = fs.readFileSync(path.join(__dirname,"../app/context/PurchasesContext.tsx"),"utf8");
const section = (a,b) => {
  const start=provider.indexOf(a), end=provider.indexOf(b,start+1);
  assert.ok(start>=0 && end>start, a);
  return provider.slice(start,end);
};
const read=section("const readVerifiedOwnership =", "/* --------------------- hydrate");
assert.ok(read.includes('.select("item_id,source")'));
assert.ok(read.includes('.eq("user_id", supabaseUserId)'));
assert.ok(read.includes("readAllVerifiedPurchases"));
assert.ok(read.includes('.order("item_id", { ascending: true })'));
assert.ok(read.includes('.gt("item_id", after)'));
assert.ok(read.includes(".limit(limit)"));
assert.ok(!read.includes("AsyncStorage") && !read.includes('.from("profiles")'));
const hydrate=section("/* --------------------- hydrate", "/* ---------------------- persist");
assert.ok(hydrate.indexOf("if (authoritative)") < hydrate.indexOf("loadLocalPurchases("));
assert.ok(hydrate.includes("if (!current()) return;"));
assert.ok(hydrate.includes("setHydrated(!authoritative || verified)"));
const persistence=section("/* ---------------------- persist","/* ---------------- achievement");
assert.ok(persistence.indexOf("!hydrated || authoritative") < persistence.indexOf("AsyncStorage.setItem"));
const memory=section("/* ------------------ sync Ask memory","/* ------------- keep");
assert.ok(memory.indexOf("!hydrated || authoritative") < memory.indexOf('.from("profiles")'));
for (const [name,next] of [["grant","revoke"],["revoke","reload"],["clearAll","value"]]) {
  const body=section("const "+name+" =", "const "+next+" =");
  assert.ok(body.indexOf("if (authoritative) throw")>=0 && body.indexOf("if (authoritative) throw")<body.indexOf("setPurchases("));
}
const reload=section("const reload =","const clearAll =");
assert.ok(reload.indexOf("if (authoritative)") < reload.indexOf("loadLocalPurchases"));
assert.ok(reload.includes("if (!current()) return;"));
assert.ok(reload.includes("setHydrated(false)"));
assert.ok(provider.includes("stateOwner === supabaseUserId ? rawPurchases : EMPTY_PURCHASES"));
assert.ok(provider.includes("Object.prototype.hasOwnProperty.call(purchases, cid)"));
console.log("PASS: verified purchases provider source-contract checks (not runtime tests).");
