// Run with node scripts/test-adventure.cjs after npm ci.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname,'../app/_lib/adventureModel.ts'),'utf8');
const {outputText,diagnostics} = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
assert.equal(diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const mod={exports:{}};
new Function('module','exports',outputText)(mod,mod.exports);
const {ADVENTURES,orderedAdventures,choosePath,startAdventure,advanceAdventure}=mod.exports;
assert.equal(new Set(ADVENTURES.map(a=>a.id)).size,ADVENTURES.length);
assert.equal(orderedAdventures(['space'])[0].id,'moon-outpost');
assert.equal(orderedAdventures(['film'])[0].id,'silent-film');
for(const a of ADVENTURES){
  const visited=new Set();
  const walk=(id,trail)=>{
    assert.ok(!trail.has(id),'cycle: '+id);
    const scene=a.scenes[id];
    assert.ok(scene,'missing scene '+id);
    visited.add(id);
    assert.ok(scene.title && scene.story);
    assert.equal(choosePath(a,id,-1),undefined);
    if(!scene.choices.length)return 1;
    return scene.choices.reduce((count,c,index)=>{
      assert.ok(c.feedback && c.label);
      assert.deepEqual(choosePath(a,id,index),c);
      return count+walk(c.next,new Set([...trail,id]));
    },0);
  };
  assert.ok(walk(a.start,new Set())>=4);
  assert.equal(visited.size,Object.keys(a.scenes).length);
}
for(const a of ADVENTURES){
 const endings=new Set();
 const start=startAdventure(a);
 assert.deepEqual(start,{sceneId:a.start,steps:[]});
 const traverse=run=>{
  const scene=a.scenes[run.sceneId];
  assert.equal(advanceAdventure(a,run,-1),run);
  assert.equal(advanceAdventure(a,run,0.5),run);
  if(!scene.choices.length){
   endings.add(run.sceneId);
   assert.equal(advanceAdventure(a,run,0),run);
   let replay=startAdventure(a);
   for(const step of run.steps){
    assert.equal(replay.sceneId,step.sceneId);
    replay=advanceAdventure(a,replay,step.choiceIndex);
   }
   assert.deepEqual(replay,run);
   return;
  }
  for(let i=0;i<scene.choices.length;i++){
   const next=advanceAdventure(a,run,i);
   assert.equal(next.sceneId,scene.choices[i].next);
   assert.deepEqual(next.steps.slice(0,-1),run.steps);
   assert.deepEqual(next.steps[next.steps.length-1],{sceneId:run.sceneId,choiceIndex:i});
   traverse(next);
  }
 };
 traverse(start);
 assert.ok(endings.size>=2);
 assert.deepEqual(startAdventure(a),start);
 assert.equal(choosePath(a,'constructor',0),undefined);
}
console.log('Adventure model checks passed');
