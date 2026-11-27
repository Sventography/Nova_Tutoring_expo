'use strict';
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const tutorial = readFileSync(path.join(__dirname, '../app/(onboarding)/tutorial.tsx'), 'utf8');
assert.match(tutorial, /Nova Coins are the only currency you earn by learning/);
assert.doesNotMatch(tutorial, /separate earned-only|Nova Rewards/i);
console.log('PASS: onboarding describes one earned currency.');
