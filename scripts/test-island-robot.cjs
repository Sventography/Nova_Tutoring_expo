const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const mod={exports:{}};
const code=ts.transpileModule(fs.readFileSync('features/adaptiveIsland/robot.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
new Function('exports',code)(mod.exports);
const {trace,limit}=mod.exports;
const commands=['Left','Forward','Forward','Forward','Right','Forward','Forward'];
const steps=trace(commands);
assert.equal(steps.at(-1).message,'Delivered the seedling to the greenhouse!');
assert.equal(steps.length,8);
assert.deepEqual(trace(commands),steps);
for(const path of [['Right','Forward'],['Forward','Left','Forward','Forward']]){
 const blocked=trace(path);
 assert.match(blocked.at(-1).message,/blocked/);
 assert.equal(blocked.at(-1).x,blocked.at(-2).x);
 assert.equal(blocked.at(-1).y,blocked.at(-2).y);
}
assert.equal(trace(Array(24).fill('Left')).length,limit+1);
assert.deepEqual(trace([]).map(({x,y,heading})=>[x,y,heading]),[[0,3,0]]);
console.log('PASS robot delivery, boundaries, rocks, bounded program, independent replay and reset.');
