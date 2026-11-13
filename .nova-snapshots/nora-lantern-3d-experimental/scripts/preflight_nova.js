const fs=require('fs');const path=require('path');const cp=require('child_process');

const ROOT='app';
const exts=['.ts','.tsx','.js','.jsx','.json'];
const indexExts=['/index.ts','/index.tsx','/index.js','/index.jsx'];
const imgRE=/\.(png|jpg|jpeg|gif|webp|svg)$/i;
const importRE=/import\s+([^'"]*?)\s+from\s+['"](\.{1,2}\/[^'"]+)['"]|import\s+([^'"]*?)\s+from\s+['"]([^'"]+)['"]|import\s*['"](\.{1,2}\/[^'"]+)['"]/g;
const requireRE=/require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
const dynamicImportRE=/import\(\s*(.+?)\s*\)/g;

function walk(dir,acc){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){if(e.name==='node_modules')continue;walk(p,acc)}else if(/\.(ts|tsx|js|jsx)$/.test(e.name))acc.push(p)}}

function resolveCandidates(base,spec){
  spec=spec.replace(/\/{2,}/g,'/');
  const noExt=!/\.[a-zA-Z0-9]+$/.test(spec);
  const cand=[];
  if(noExt){for(const ext of exts)cand.push(path.resolve(base,spec+ext));for(const ext of indexExts)cand.push(path.resolve(base,spec+ext))}
  else{cand.push(path.resolve(base,spec))}
  return cand;
}

function ensureDir(p){fs.mkdirSync(path.dirname(p),{recursive:true})}

function makeStubModule(abs,info){
  const out=abs.replace(/\.[a-zA-Z0-9]+$/,'')+'.ts';
  ensureDir(out);
  let body='';
  const names=[...(info.names||[])];
  for(const n of names){ if(!/^[A-Za-z_$][\w$]*$/.test(n)) continue; body+=`export function ${n}(){ return undefined as any }\n` }
  if(info.default){ body+=`const _default = { ${names.join(', ')} };\nexport default _default;\n` } else { body+=`export default {} as any;\n` }
  fs.writeFileSync(out,body);
  return out;
}

function dedupeReactImport(file){
  const s=fs.readFileSync(file,'utf8');
  const lines=s.split('\n'); let seen=false; let changed=false;
  const out=lines.filter(line=>{
    const m=/^\s*import\s+React(?:\s*,|\s)/.test(line)&&/from\s+['"]react['"]\s*;?\s*$/.test(line);
    if(m){ if(seen){ changed=true; return false } seen=true }
    return true
  }).join('\n');
  if(changed){fs.writeFileSync(file,out);return true}
  return false
}

function normalizeDoubleSlashes(file){
  let s=fs.readFileSync(file,'utf8'); let changed=false;
  s=s.replace(/from\s+['"](\.{1,2}\/[^'"]*)['"]/g,(m,p)=>{const n=p.replace(/\/{2,}/g,'/'); if(n!==p){changed=true; return `from "${n}"`} return m});
  s=s.replace(/require\(\s*['"](\.{1,2}\/[^'"]*)['"]\s*\)/g,(m,p)=>{const n=p.replace(/\/{2,}/g,'/'); if(n!==p){changed=true; return `require("${n}")`} return m});
  if(changed)fs.writeFileSync(file,s);
  return changed
}

function getPkgJSON(){try{return JSON.parse(fs.readFileSync('package.json','utf8'))}catch(e){return {}}}

function installMissingExpo(pkgs){
  if(!pkgs.length) return;
  try{cp.execSync(`npx expo install ${pkgs.join(' ')}`,{stdio:'inherit'})}catch(e){}
}

const srcFiles=[]; if(fs.existsSync(ROOT)) walk(ROOT,srcFiles);
let changedCount=0, stubbedModules=0, stubbedAssets=0, reactDedupe=0, normalized=0;
const expoUsed=new Set(); const expoInstalled=new Set(Object.keys({...getPkgJSON().dependencies,...getPkgJSON().devDependencies}));

const dynamicSpots=[];
for(const file of srcFiles){
  normalized += normalizeDoubleSlashes(file)?1:0;
  reactDedupe += dedupeReactImport(file)?1:0;

  let s=fs.readFileSync(file,'utf8'); let m;
  while((m=importRE.exec(s))){
    const clauseRel=m[1]; const specRel=m[2]; const clauseAbs=m[3]; const specAbs=m[4]; const bareReq=m[5];
    if(specAbs && /^expo-/.test(specAbs)) expoUsed.add(specAbs);
    const base=path.dirname(file);

    const pushMissing=(spec,clause)=>{
      const candidates=resolveCandidates(base,spec);
      const exists=candidates.some(p=>fs.existsSync(p));
      if(exists) return;
      const abs=candidates[0]||path.resolve(base,spec);
      if(imgRE.test(spec)){
        ensureDir(abs);
        if(abs.toLowerCase().endsWith('.svg')) fs.writeFileSync(abs,'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
        else fs.writeFileSync(abs,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==','base64'));
        stubbedAssets++;
      }else{
        const info={default:false,names:new Set()};
        if(clause){
          const def=/^\s*([A-Za-z_$][\w$]*)\s*(,|$)/.exec(clause); if(def) info.default=true;
          const named=/\{([^}]+)\}/.exec(clause);
          if(named){ for(const part of named[1].split(',')){ const seg=part.trim(); if(!seg) continue; const orig=seg.split(/\s+as\s+/)[0].trim(); if(orig) info.names.add(orig) } }
        }
        makeStubModule(abs,info); stubbedModules++;
      }
    };

    if(specRel) pushMissing(specRel, clauseRel);
    if(bareReq) pushMissing(bareReq, null);
  }

  let dm; while((dm=dynamicImportRE.exec(s))){
    const expr=dm[1].trim();
    if(!/^['"][^'"]+['"]$/.test(expr)) dynamicSpots.push(file+':'+s.slice(0,dm.index).split('\n').length);
  }
}

const missingExpo=[...expoUsed].filter(x=>!expoInstalled.has(x));
installMissingExpo(missingExpo);

if(!fs.existsSync('declaration.json.d.ts')) fs.writeFileSync('declaration.json.d.ts',"declare module '*.json' { const v: any; export default v }\n");

console.log('preflight complete');
console.log('files normalized:',normalized);
console.log('react import deduped:',reactDedupe);
console.log('stubbed modules:',stubbedModules);
console.log('stubbed assets:',stubbedAssets);
if(missingExpo.length) console.log('installed expo packages:',missingExpo.join(', '));
if(dynamicSpots.length){ console.log('dynamic imports to fix:'); for(const x of dynamicSpots) console.log(' -',x) }
