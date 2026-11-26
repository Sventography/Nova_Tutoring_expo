"use strict";

const assert = require("node:assert/strict");
const { build } = require("../eas.json");

for (const name of ["development", "preview", "production"]) {
  assert.equal(build[name]?.environment, name, `EAS ${name} must select its own environment`);
}
console.log("PASS: EAS development, preview and production scopes");
