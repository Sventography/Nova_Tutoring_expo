"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = name => fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const shop=read("app/(tabs)/shop.tsx");
for(const name of ["processCompletedIapPurchase","processCompletedAiSubscriptionPurchase","restoreAvailableIapPurchases","buyAiSubscription","buyWithIap","startIap","onUrl","handleAddressConfirm","moneyBuy","buyWithCoins"]){
  const declaration=new RegExp("(?:const|(?:async )?function) "+name+"\\b");
  const i=shop.search(declaration);
  assert.ok(i>=0 && shop.slice(i,i+550).includes("if (STAGING_CHECKOUT_CLOSED"),name);
}
const stub=read("server/verify-iap.ts");
assert.ok(stub.includes("status(501)"));
assert.ok(!stub.includes("ok: true"));
console.log("PASS: staging checkout and retired verification guards");
