// Run with node scripts/test-discovery-reflection.cjs after npm ci.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(name, dependencies = {}) {
 const source = fs.readFileSync(path.join(__dirname,'../app/_lib',name+'.ts'),'utf8');
 const {outputText,diagnostics} = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
 assert.equal(diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
 const mod={exports:{}};
 new Function('module','exports','require',outputText)(mod,mod.exports,key=>{assert.ok(Object.hasOwn(dependencies,key));return dependencies[key];});
 return mod.exports;
}
const model=load('discoveryModel');
const {reflectionFor,discoveryNote}=load('discoveryReflection',{'./discoveryModel':model});
for(const d of model.DISCOVERIES){
 const reflection=reflectionFor(d.id);
 assert.ok(reflection.question && reflection.explanation);
 const note=discoveryNote(d.id);
 assert.ok(note.startsWith(d.title+'\n'));
 assert.ok(note.includes(d.insight) && note.includes(d.activity));
 assert.ok(note.includes('My own thoughts:') && note.includes('Questions I want to explore next:'));
 assert.ok(!note.includes(d.prompt));
}
for(const id of ['unknown','__proto__','constructor','']){
 assert.equal(reflectionFor(id),undefined);
 assert.equal(discoveryNote(id),undefined);
}
console.log('Discovery reflection checks passed');
