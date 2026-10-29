/**
 * Pure regression checks for the #017 castle's larger ground footprint,
 * protected Daily Quest + Nova positions, deterministic spawn and repair.
 * No Supabase connection, QR codes, or private data. Runs in GitHub CI.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const catalogs = {
  "noras_last_lantern_017": { model: "noras_last_lantern" },
  starflower: { model: "flower" },
};

const auto = { exports: {} };
vm.runInNewContext(transpile(read("app/_lib/islandAutoPlacement.ts")), {
  module: auto,
  exports: auto.exports,
  __DEV__: false,
  process: { env: {} },
  require: (name) => {
    if (name === "./islandBuilderBounds") {
      return {
        isIslandBuildPositionValid: (x, z, scale = 1) => {
          const radius = Math.max(1, 29 - (0.38 + Math.max(0, scale - 1) * 0.34));
          return x * x + z * z <= radius * radius;
        },
      };
    }
    if (name === "./islandDecorationCatalog") {
      return { ISLAND_DECORATION_CATALOG_BY_ID: catalogs };
    }
    if (name === "./islandBuilderCatalog") {
      return { ISLAND_BUILDER_CATALOG: [], ISLAND_BUILDER_CATALOG_BY_ID: {} };
    }
    throw new Error("Unexpected import: " + name);
  },
}, { filename: "islandAutoPlacement.ts" });

const geo = auto.exports;
const castleRadius = geo.decorationGroundRadius("noras_last_lantern_017", 1);
const flowerRadius = geo.decorationGroundRadius("starflower", 1);
assert.ok(castleRadius >= 4.5, "Entire castle foundation and royal approach must fit");
assert.ok(flowerRadius < 0.5, "Ordinary flower footprints must remain unchanged");

const quest = geo.DAILY_QUEST_GROUND_OBSTACLE;
const nova = geo.NOVA_PEDESTAL_GROUND_OBSTACLE;
const home = geo.COLLECTOR_CASTLE_PREFERRED_GROUND;
assert.ok(quest.radius >= 3.5, "Protect the complete quest station");
// Verify the exclusion center tracks the real, transformed 3D plaza,
// including the station-local x/z offset and its two yaw rotations.
const plazaOffsetX = 0.55 * 1.42, plazaOffsetZ = 0.05 * 1.42;
const rotateY = (x, z, yaw) => ({
  x: x * Math.cos(yaw) + z * Math.sin(yaw),
  z: -x * Math.sin(yaw) + z * Math.cos(yaw),
});
const localPlaza = rotateY(plazaOffsetX, plazaOffsetZ, -0.42);
const worldPlaza = rotateY(4.15 + localPlaza.x, 0.55 + localPlaza.z, -0.08);
assert.ok(
  Math.hypot(quest.x - worldPlaza.x, quest.z - worldPlaza.z) < 0.4,
  "Protected quest location must match the island's transformed 3D plaza"
);
assert.ok(!geo.overlapsGround(home, castleRadius, [quest, nova], 0.45));
assert.ok(nova.radius >= 2.5, "Protect Nova's sprite and pedestal, not only the small mesh");
const novaAnchor = rotateY(-3, 1.6, -0.08);
assert.ok(
  Math.hypot(nova.x - novaAnchor.x, nova.z - novaAnchor.z) < 0.25,
  "Protected Nova position must match the transformed 3D sprite pedestal"
);
assert.ok(geo.overlapsGround({x: -3.05, z: 1.45}, castleRadius, [nova]));

const oldNearQuest = { x: 4.15, z: 0.55 };
assert.ok(geo.overlapsGround(oldNearQuest, castleRadius, [quest]));
const safe = geo.findNearestFreeGround(oldNearQuest, castleRadius, [
  quest,
  nova,
  { x: -4.45, z: -1.1, radius: 1.65 },
  { x: 0.2, z: -1.5, radius: 2.1 },
], { gap: 0.45 });
assert.ok(safe, "There should still be free ground for the large castle");
assert.ok(!geo.overlapsGround(safe, castleRadius, [quest, nova], 0.45));

const contextSource = read("app/context/IslandDecorationContext.tsx");
assert.match(contextSource, /if \(itemId === COLLECTOR_REWARD_ID\)[\s\S]*?COLLECTOR_CASTLE_PREFERRED_GROUND/);
assert.match(contextSource, /landmarkObstacles\.push\(DAILY_QUEST_GROUND_OBSTACLE\)/);
assert.match(contextSource, /landmarkObstacles\.push\(NOVA_PEDESTAL_GROUND_OBSTACLE\)/);
assert.match(contextSource, /moveCastleOffProtectedLandmarks\(\s*reconcileCollectorReward/);

// Exercise the SAME production-layout repair function without any React app,
// database access or account data. Isolate the pure function using TypeScript's
// transpiler; no local storage is changed by these checks.
const match = contextSource.match(/function moveCastleOffProtectedLandmarks\([\s\S]*?\n}\n/);
assert.ok(match, "Castle-over-protected-landmarks repair must exist");
const sandbox = {
  module: { exports: null },
  COLLECTOR_REWARD_ID: "noras_last_lantern_017",
  DAILY_QUEST_GROUND_OBSTACLE: quest,
  NOVA_PEDESTAL_GROUND_OBSTACLE: nova,
  COLLECTOR_CASTLE_PREFERRED_GROUND: home,
  decorationGroundRadius: geo.decorationGroundRadius,
  overlapsGround: geo.overlapsGround,
  findNearestFreeGround: geo.findNearestFreeGround,
  cloneState: (state) => JSON.parse(JSON.stringify(state)),
  Date,
};
vm.runInNewContext(transpile(match[0]) + "\nmodule.exports = moveCastleOffProtectedLandmarks;", sandbox, {
  filename: "collectorCastleLegacyRepair.ts",
});
const repair = sandbox.module.exports;
const placement = (id, itemId, x, z) => ({
  placementId: id,
  itemId,
  transform: { x, z, scale: 1, rotationY: 0 },
  placedAt: 1,
  updatedAt: 1,
});
const original = {
  version: 1,
  ownedCounts: { noras_last_lantern_017: 1, starflower: 1 },
  firstAcquiredAt: { noras_last_lantern_017: 1, starflower: 1 },
  firstAcquiredAtEstimated: {},
  placements: [
    placement("castle-id", "noras_last_lantern_017", 4.15, 0.55),
    placement("flower-id", "starflower", -3, 8),
  ],
  updatedAt: 1,
};
const fixed = repair(original, [quest, nova]);
assert.notEqual(fixed, original, "Bad old placement must be repaired");
assert.equal(original.placements[0].transform.x, 4.15, "Do not mutate original layout");
assert.equal(fixed.placements[0].placementId, "castle-id", "Preserve placement identity");
assert.equal(fixed.ownedCounts.noras_last_lantern_017, 1, "Never grant extra ownership");
assert.equal(fixed.placements[1].transform.x, -3, "Leave ordinary decorations untouched");
assert.ok(!geo.overlapsGround(fixed.placements[0].transform, castleRadius, [quest, nova], 0.4));
assert.equal(repair(fixed, [quest, nova]), fixed, "Safe layout must not be moved again");

// Same one-time layout repair must also rescue an old castle which
// obstructs Nova while leaving all other decorations and ownership alone.
const againstNova = {
  ...original,
  placements: [
    placement("castle-id", "noras_last_lantern_017", -3, 1.6),
    placement("flower-id", "starflower", -3, 8),
  ],
};
const repairedNova = repair(againstNova, [quest, nova]);
assert.notEqual(repairedNova, againstNova);
assert.equal(repairedNova.placements[0].placementId, "castle-id");
assert.equal(repairedNova.placements[1].transform.z, 8);
assert.equal(repairedNova.ownedCounts.noras_last_lantern_017, 1);
assert.ok(!geo.overlapsGround(repairedNova.placements[0].transform, castleRadius, [quest, nova], 0.4));

const certificate = read("app/collector/index.tsx");
const staging = read("app/collector-staging.tsx");
const builder = read("app/components/island3d/IslandBuilderPanel.tsx");
const shop = read("app/components/island3d/IslandDecorationShopPanel.tsx");
assert.match(certificate, /Decoration Inventory/);
assert.match(certificate, /Open my island/);
assert.match(staging, /castle is waiting to be placed/);
assert.match(builder, /Nora's castle is ready/);
assert.match(shop, /if \(castleWaiting\) setInventoryOpen\(true\)/);
console.log("Collector #017 placement and discovery checks passed.");
