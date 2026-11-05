// Execute the real builder provider and collision helpers with local React/storage doubles.
// No account credentials or network calls. Run: node scripts/test-collector-landmarks.cjs
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.NOVA_TEST_ROOT || path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
const transpile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true},
}).outputText;
const cache = new Map();
function library(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  vm.runInNewContext(transpile(file), {exports, require(name) {
    if (!name.startsWith('.')) throw Error('Unexpected helper import: ' + name);
    return library(path.relative(root, path.resolve(path.dirname(file), name + '.ts')));
  }});
  return exports;
}
const catalog = library('app/_lib/islandBuilderCatalog.ts');
const geometry = library('app/_lib/islandAutoPlacement.ts');
const libraryItem = catalog.ISLAND_BUILDER_CATALOG_BY_ID.nova_library;
const initial = () => ({
  version: 2, inventory: {}, grantedCatalogIds: catalog.ISLAND_BUILDER_CATALOG.map(item => item.id),
  placements: [{placementId: 'library', itemId: libraryItem.id, landmassId: libraryItem.landmassId,
    transform: {...libraryItem.defaultTransform}, placedAt: 1, updatedAt: 1}], updatedAt: 1,
});
function harness() {
  const hooks = [], effects = [];
  const values = new Map();
  let account = 'owner', hookIndex = 0, queued = false, value;
  const equalDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {queued = false; render();});
  };
  const React = {
    createContext: () => ({Provider: 'Provider'}),
    createElement: (type, props, ...children) => ({type, props: {...props, children}}),
    useState(first) {
      const i = hookIndex++;
      if (!hooks[i]) hooks[i] = {value: typeof first === 'function' ? first() : first};
      return [hooks[i].value, next => {
        const resolved = typeof next === 'function' ? next(hooks[i].value) : next;
        if (!Object.is(resolved, hooks[i].value)) {hooks[i].value = resolved; schedule();}
      }];
    },
    useRef(first) {const i = hookIndex++; return hooks[i] || (hooks[i] = {current: first});},
    useMemo(make, deps) {
      const i = hookIndex++;
      if (!hooks[i] || !equalDeps(hooks[i].deps, deps)) hooks[i] = {deps, value: make()};
      return hooks[i].value;
    },
    useCallback(callback, deps) {return React.useMemo(() => callback, deps);},
    useEffect(callback, deps) {
      const i = hookIndex++;
      if (!hooks[i] || !equalDeps(hooks[i].deps, deps)) {
        const old = hooks[i];
        hooks[i] = {deps};
        effects.push(() => {old?.cleanup?.(); hooks[i].cleanup = callback();});
      }
    },
  };
  const exports = {};
  vm.runInNewContext(transpile(path.join(root, 'app/context/IslandBuilderContext.tsx')), {
    exports, console: {warn() {}}, require(name) {
      if (name === 'react') return React;
      if (name === '@react-native-async-storage/async-storage') return {
        getItem: async key => values.get(key) || JSON.stringify(initial()),
        setItem: async (key, json) => {values.set(key, json);},
      };
      if (name === '../_lib/islandBuilderCatalog') return catalog;
      if (name === '../_lib/islandAutoPlacement') return geometry;
      if (name === './IslandContext') return {useIsland: () => ({islandLevel: 21, ready: true})};
      if (name === './UserContext') return {useUser: () => ({supabaseUserId: account, ready: true})};
      throw Error('Unexpected provider import: ' + name);
    },
  });
  function render() {
    hookIndex = 0;
    value = exports.IslandBuilderProvider({children: null}).props.value;
    while (effects.length) effects.shift()();
  }
  render();
  return {
    get value() {return value;},
    async settle() {for (let i = 0; i < 18; i++) await Promise.resolve();},
    switchAccount(id) {account = id; render();},
  };
}
(async () => {
  const app = harness(); await app.settle();
  app.value.startEditing(); await app.settle();
  const setter = app.value.setCollectorCastleObstacle;
  assert.equal(app.value.movePlacement('library', {x: 10, z: -10}), true, 'Nonowner builder keeps existing movement behavior');
  await app.settle();
  assert.equal(app.value.setCollectorCastleObstacle, setter, 'Obstacle registration does not trigger effect loops');
  const castle = {x: 10, z: -10, radius: 4.8};
  setter(castle);
  assert.equal(app.value.movePlacement('library', {x: 10, z: -10}), false, 'Landmark cannot move into castle');
  assert.equal(app.value.movePlacement('library', {x: 1, z: -10}), true);
  await app.settle();
  assert.equal(app.value.scalePlacement('library', 4), false, 'Enlarging a nearby landmark cannot cover castle');
  await app.settle();
  assert.equal(app.value.placements[0].transform.scale, 1, 'Rejected resize preserves previous transform');
  assert.equal(app.value.returnToInventory('library'), true); await app.settle();
  const placed = app.value.placeItem('nova_library', {x: 10, z: -10});
  assert.ok(placed, 'Landmark inventory placement finds nearby free ground'); await app.settle();
  const movedLibrary = app.value.placements.find(item => item.placementId === placed);
  assert.equal(geometry.overlapsGround(movedLibrary.transform, geometry.landmarkGroundRadius('nova_library', 1), [castle]), false);
  assert.equal(app.value.getInventoryCount('nova_library'), 0, 'Safe placement consumes exactly one inventory item');

  app.value.returnToInventory(placed); await app.settle();
  setter({x: 0, z: 0, radius: 100});
  assert.equal(app.value.placeItem('nova_library'), null, 'Full obstruction fails without consuming inventory');
  assert.equal(app.value.getInventoryCount('nova_library'), 1);

  const resetCastle = {x: libraryItem.defaultTransform.x, z: libraryItem.defaultTransform.z, radius: 4.8};
  setter(resetCastle);
  assert.equal(app.value.resetDraftToDefaultLayout(), true); await app.settle();
  for (const placement of app.value.placements) {
    assert.equal(geometry.overlapsGround(placement.transform, geometry.landmarkGroundRadius(placement.itemId, placement.transform.scale), [resetCastle]), false,
      'Reset defaults cannot cover castle: ' + placement.itemId);
  }

  // Previous account registration is ignored even before the child cleanup runs.
  setter(castle);
  app.switchAccount('another-account'); await app.settle();
  app.value.startEditing(); await app.settle();
  assert.equal(app.value.movePlacement('library', {x: 10, z: -10}), true, 'Previous owner obstacle does not constrain next account');
  await app.settle();
  app.value.setCollectorCastleObstacle(castle);
  app.value.setCollectorCastleObstacle(null);
  assert.equal(app.value.scalePlacement('library', 4), true, 'Removing castle removes collision guard');
  console.log('PASS: landmark movement/scale/placement/reset protect verified castle; rejected placement preserves inventory; account-scoped registration; baseline builder behavior.');
})().catch(error => {console.error(error); process.exitCode = 1;});
