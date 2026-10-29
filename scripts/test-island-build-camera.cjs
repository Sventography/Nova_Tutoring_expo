/**
 * BUILD-mode camera regression: rotate, tilt, pan and zoom must remain
 * navigable in build mode and must never write item placement state.
 * Exercises the pure camera math and checks the web gesture wiring.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const helper = read("app/_lib/islandCameraNavigation.ts");
const result = ts.transpileModule(helper, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  reportDiagnostics: true,
});
const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
assert.equal(errors.length, 0, "Camera math helper must transpile without TypeScript syntax errors");

const helperExports = {};
vm.runInNewContext(result.outputText, {
  exports: helperExports, module: { exports: helperExports },
}, {
  filename: "islandCameraNavigation.ts",
});
const { panIslandCameraTarget, orbitIslandCamera } = helperExports;
assert.equal(typeof panIslandCameraTarget, "function");
assert.equal(typeof orbitIslandCamera, "function");

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.0001, actual + " ≠ " + expected);

// Screen-right drag at azimuth 0 pans the camera target left.
const first = panIslandCameraTarget([0, 1, 0], 0, 100, 0, 40);
near(first[0], -1.6);
near(first[1], 1);
near(first[2], 0);

// The same gesture with the camera spun 90° pans along the other axis.
const spun = panIslandCameraTarget([0, 1, 0], Math.PI / 2, 100, 0, 40);
near(spun[0], 0);
near(spun[2], 1.6);

// Vertical drag in an arbitrary orbit moves the ground-plane target.
const up = panIslandCameraTarget([3, 1, -2], Math.PI / 4, 0, -100, 40);
assert.notEqual(up[0], 3);
assert.notEqual(up[2], -2);
near(up[1], 1);

// Extreme drags cannot lose the island.
const bounded = panIslandCameraTarget([0, 1, 0], 0, -999999, 999999, 80);
assert.ok(Math.abs(bounded[0]) <= 21 && Math.abs(bounded[2]) <= 21);
near(bounded[1], 1);

const orbit = orbitIslandCamera(0.58, 0.98, 100, -50);
near(orbit.azimuth, 0.08);
near(orbit.polar, 0.805);
near(orbitIslandCamera(0, 0.98, 0, -99999).polar, 0.38);
near(orbitIslandCamera(0, 0.98, 0, 99999).polar, 1.34);

// JSX syntax check for this newly modified large legacy scene, independent
// of the repository's known unrelated semantic TS errors.
const scene = read("app/components/island3d/NovaIsland3DScene.tsx");
const transpiled = ts.transpileModule(scene, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.React,
  },
  reportDiagnostics: true,
});
const sceneSyntaxErrors = (transpiled.diagnostics || [])
  .filter(d => d.category === ts.DiagnosticCategory.Error);
assert.equal(sceneSyntaxErrors.length, 0,
  "Modified scene JSX should transpile without parse errors: " +
  sceneSyntaxErrors.map(e => ts.flattenDiagnosticMessageText(e.messageText, " ")).join(" | "));

const pointerStart = scene.indexOf('const onPointerDown = (event: any) => {', scene.indexOf('const surface = webIslandSurfaceRef.current'));
const pointerEnd = scene.indexOf('const onPointerMove = (event: any) => {', pointerStart);
assert.ok(pointerStart > 0 && pointerEnd > pointerStart, "Web camera pointer handler must exist");
const pointerDown = scene.slice(pointerStart, pointerEnd);
assert.doesNotMatch(pointerDown,
  /if\s*\(\s*builderEditing\s*\|\|/,
  "Web pointerdown must never globally disable camera in BUILD mode");
assert.match(pointerDown, /event\.button !== 0 && event\.button !== 2/,
  "Both normal orbit and right-drag camera pan should be available");
assert.match(pointerDown, /builderDragRef\.current/);
assert.match(pointerDown, /getArmedDecorationDrag\(\)/);
assert.match(pointerDown, /getArmedKeepsakeDrag\(\)/);
assert.match(scene, /controlsRef\.current\.desiredTarget = panIslandCameraTarget\(/,
  "Web camera must pan when Shift/right drag is active");
assert.match(scene, /const orbit = orbitIslandCamera\(/,
  "Web camera must rotate when dragging empty space");
assert.match(scene, /event\.shiftKey/);
assert.match(scene, /event\.button === 2/);
assert.match(scene, /surface\.addEventListener\("contextmenu", onContextMenu\)/);
assert.match(scene, /nudgeIslandCamera\("orbit-left"\)/);
assert.match(scene, /nudgeIslandCamera\("orbit-right"\)/);
assert.match(scene, /nudgeIslandCamera\("pan-left"\)/);
assert.match(scene, /nudgeIslandCamera\("pan-up"\)/);
assert.match(scene, /nudgeIslandCamera\("pan-down"\)/);
assert.match(scene, /nudgeIslandCamera\("pan-right"\)/);
assert.match(scene, /nudgeIslandCamera\("tilt-up"\)/);
assert.match(scene, /nudgeIslandCamera\("tilt-down"\)/);
assert.match(scene, /"BUILD: Drag empty space to rotate/);
assert.match(scene, /onPress={resetView}/);
console.log("Island BUILD camera geometry, gesture and UI checks passed.");
