// Run with node scripts/test-discovery-practice.cjs after npm ci.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
function load(name,deps={}){
 const source=fs.readFileSync(path.join(__dirname,'../app/_lib',name+'.ts'),'utf8');
 const {outputText,diagnostics}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
 assert.equal(diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
 const mod={exports:{}};
 new Function('module','exports','require',outputText)(mod,mod.exports,k=>{assert.ok(Object.hasOwn(deps,k));return deps[k]});
 return mod.exports;
}
const d=load('discoveryModel');
const f=load('discoveryReflection',{'./discoveryModel':d});
const p=load('discoveryPractice',{'./discoveryModel':d,'./discoveryReflection':f});
for(const lesson of d.DISCOVERIES){
 const card=p.practiceFor(lesson.id), recall=p.recallFor(lesson.id);
 assert.ok(card.question && card.explanation && recall.front && recall.back);
 assert.equal(card.options.length,3);
 assert.equal(new Set(card.options).size,3);
 assert.ok(Number.isInteger(card.answer)&&card.answer>=0&&card.answer<3);
 for(let i=0;i<3;i++) assert.deepEqual(p.evaluatePractice(lesson.id,i),{correct:i===card.answer,explanation:card.explanation});
 for(const i of [-1,3,NaN,1.5]) assert.equal(p.evaluatePractice(lesson.id,i),undefined);
}
for(const id of ['unknown','__proto__','constructor','']){
 assert.equal(p.practiceFor(id),undefined);assert.equal(p.recallFor(id),undefined);assert.equal(p.evaluatePractice(id,0),undefined);
}
console.log('Discovery practice checks passed');
