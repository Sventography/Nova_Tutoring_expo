"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "..", "app/(tabs)/shop.tsx"), "utf8");
assert.ok(source.includes("Nova Coins are the in-app currency for digital items"));
assert.ok(source.includes("the only currency you earn by studying"));
assert.ok(source.includes("optional coin packs and premium items are separate Apple in-app purchases"));
assert.ok(source.includes('{NOVA_COIN_COPY}{Platform.OS === "ios"'), "The Shop shows Apple wording on iOS");
assert.equal(source.includes("merchRewards"), false);
assert.equal(source.includes("useMerchRewards"), false);
assert.equal(source.includes("Nova Rewards"), false);
assert.equal(source.includes("a separate earned-only reward balance"), false);
assert.ok(source.includes("REQUIRES_SHIPPING"), "physical goods must retain cash-shipping distinction");
console.log("PASS: shop copy describes one in-app currency without changing checkout logic.");

// Retired bundle must never reappear in the active catalog or new checkout.
const catalogSource = fs.readFileSync(path.join(__dirname, "..", "app/_lib/catalog.ts"), "utf8");
const activeCatalog = catalogSource.split("export const catalog: CatalogItem[] = [")[1].split("\n];")[0];
assert.ok(!activeCatalog.includes("bundle_neon"), "retired bundle is not sold");
assert.ok(activeCatalog.includes('id: "theme_neon"'));
assert.ok(activeCatalog.includes('id: "cursor_orb"'));
assert.ok(catalogSource.includes("export const RETIRED_NEON_BUNDLE: CatalogItem"));
assert.ok(catalogSource.includes('bundleGrants: ["theme_neon", "cursor_orb"]'));
assert.ok(source.includes("if (isRetiredNeonBundle(pid)) return RETIRED_NEON_BUNDLE;"));
assert.ok(source.includes("if (isRetiredNeonBundle(it?.id) || isRetiredNeonBundle(resolveStoreProductId(it))) return;"));
assert.ok(source.includes("if (isRetiredNeonBundle(it?.id)) return;"));
console.log("PASS: retired Neon bundle excluded from sale, legacy fulfillment retained.");
