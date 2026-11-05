// Exercise the shipped footprint search against the production landmark layout.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const modules = new Map();
function load(name) {
  const filename = path.resolve(root, 'app/_lib', `${name}.ts`);
  if (modules.has(filename)) return modules.get(filename);
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
  }).outputText;
  vm.runInNewContext(js, {exports, require: name => load(name.replace(/^\.\//, ''))}, {filename});
  modules.set(filename, exports);
  return exports;
}
const geometry = load('islandAutoPlacement');
const catalog = load('islandDecorationCatalog');
const landmarks = load('islandBuilderCatalog');
const reward = 'noras_last_lantern_017';
const castle = catalog.ISLAND_DECORATION_CATALOG_BY_ID[reward];
assert.equal(catalog.ISLAND_DECORATION_CATALOG.filter(item => item.id === reward).length, 1);
assert.equal(catalog.isIslandDecorationCoinShopItem(castle), false);
assert.equal(catalog.isIslandDecorationCoinShopItem({...castle, collectorOnly: false}), false);
assert.equal(catalog.isIslandDecorationCoinShopItem(catalog.ISLAND_DECORATION_CATALOG_BY_ID.path_stone), true);
assert.equal(castle.minScale, 1);
assert.equal(castle.maxScale, 1);
const obstacles = [geometry.NOVA_PEDESTAL_GROUND_OBSTACLE, ...landmarks.ISLAND_BUILDER_CATALOG.map(item => ({
  x: item.defaultTransform.x, z: item.defaultTransform.z,
  radius: geometry.landmarkGroundRadius(item.id, item.defaultTransform.scale),
}))];
assert.equal(geometry.NOVA_PEDESTAL_GROUND_OBSTACLE.x, -3);
assert.equal(geometry.NOVA_PEDESTAL_GROUND_OBSTACLE.z, 1.6);
const radius = geometry.decorationGroundRadius(reward, 1);
assert.ok(radius >= 4.8, 'Protect foundation and long royal approach');
const point = geometry.findNearestFreeGround(geometry.COLLECTOR_CASTLE_PREFERRED_GROUND, radius, obstacles);
assert.ok(point, 'The production default island has space for the castle');
assert.equal(geometry.overlapsGround(point, radius, obstacles), false);
assert.ok(Math.hypot(point.x, point.z) + radius <= 23.1, 'Entire castle stays on the main island');
const movedLibrary = {x: point.x, z: point.z, radius: 3};
const relocated = geometry.findNearestFreeGround(point, radius, [...obstacles, movedLibrary]);
assert.ok(relocated, 'A moved library forces a separate castle spawn');
assert.ok(Math.hypot(relocated.x - point.x, relocated.z - point.z) >= radius + 3.25);
assert.equal(geometry.findNearestFreeGround({x: 0, z: 0}, radius, [{x: 0, z: 0, radius: 100}]), null);
const edge = geometry.findNearestFreeGround({x: 23, z: 0}, radius, []);
assert.ok(edge && Math.hypot(edge.x, edge.z) + radius <= 23.1);
assert.equal(geometry.findNearestFreeGround({x: NaN, z: 0}, radius, []), null);
console.log('PASS: collector catalog, separate spawn, occupied-island search, and full footprint boundaries');

const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
for (const flag of ['EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED', 'EXPO_PUBLIC_COLLECTOR_STAGING_MODE', 'EXPO_PUBLIC_COLLECTOR_STAGING_WEB_PREVIEW', 'EXPO_PUBLIC_NORAS_LANTERN_PREVIEW']) {
  assert.equal(eas.build.production.env[flag], 'false');
}
function appConfig(env = {}) {
  const source = fs.readFileSync(path.join(root, 'app.config.js'), 'utf8').replace('export default', 'module.exports =');
  const module = {exports: {}};
  vm.runInNewContext(source, {module, process: {env}});
  return module.exports({config: {}});
}
assert.equal(appConfig().name, 'Nova Tutoring');
assert.equal(appConfig().scheme, 'nova');
assert.equal(appConfig().ios.bundleIdentifier, 'com.sventography.novatutoring.ios');
for (const flag of ['EXPO_PUBLIC_COLLECTOR_STAGING_MODE', 'EXPO_PUBLIC_COLLECTOR_STAGING_WEB_PREVIEW', 'EXPO_PUBLIC_NORAS_LANTERN_PREVIEW']) {
  assert.throws(() => appConfig({[flag]: 'true'}), /not allowed/);
}
console.log('PASS: production build flags and staging exclusion');
