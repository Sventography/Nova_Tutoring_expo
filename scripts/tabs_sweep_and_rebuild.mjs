import fs from "fs";
import path from "path";

const tabsDir = path.join("app","(tabs)");
const quarantineDir = path.join("app","_quarantine");
fs.mkdirSync(quarantineDir,{recursive:true});

if(!fs.existsSync(tabsDir)){console.error("Missing",tabsDir);process.exit(1);}

// remove accidental nested "(tabs)" folders inside tabs
function sweepNestedTabs(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p = path.join(dir,ent.name);
    if(ent.isDirectory()){
      if(ent.name==="(tabs)" && path.normalize(p)!==path.normalize(tabsDir)){
        const dst = path.join(quarantineDir,`NESTED_TABS_${Date.now()}`);
        fs.renameSync(p,dst);
        console.log("Moved nested (tabs):",p,"→",dst);
      }else{
        sweepNestedTabs(p);
      }
    }
  }
}
sweepNestedTabs(tabsDir);

// collect immediate segments from files and folder indexes
const entries = fs.readdirSync(tabsDir,{withFileTypes:true});
const cand = new Map(); // seg -> array of {path, kind}
function add(seg,p,kind){ if(!cand.has(seg)) cand.set(seg,[]); cand.get(seg).push({path:p,kind}); }

for(const e of entries){
  const p = path.join(tabsDir,e.name);
  if(e.isFile()){
    const m = /^([A-Za-z0-9_-]+)\.(tsx|ts|jsx|js)$/.exec(e.name);
    if(m) add(m[1],p,"file");
  }else if(e.isDirectory()){
    const ix = ["index.tsx","index.ts","index.jsx","index.js"].find(f=>fs.existsSync(path.join(p,f)));
    if(ix) add(e.name,path.join(p,ix),"dir");
  }
}

// resolve duplicates per segment: keep 1, move the rest away
const kept = new Map(); // seg -> kept path
for(const [seg,list] of cand.entries()){
  if(list.length===1){ kept.set(seg,list[0].path); continue; }
  // prefer single file over folder/index, else first
  let keep = list.find(x=>x.kind==="file")?.path || list[0].path;
  kept.set(seg,keep);
  for(const item of list){
    if(item.path===keep) continue;
    const base = path.basename(item.path).replace(/\//g,"_");
    const dst = path.join(quarantineDir,`${seg}__dupe__${base}__${Date.now()}`);
    const dirToMove = item.kind==="dir" ? path.dirname(item.path) : item.path;
    try{
      fs.renameSync(dirToMove,dst);
      console.log("Quarantined duplicate",seg,":",dirToMove,"→",dst);
    }catch(e){
      console.warn("Failed to quarantine",dirToMove,":",e.message);
    }
  }
}

// recompute final segment list from filesystem after moves
function finalSegments(){
  const out = [];
  const ents = fs.readdirSync(tabsDir,{withFileTypes:true});
  for(const e of ents){
    const p = path.join(tabsDir,e.name);
    if(e.isFile()){
      const m = /^([A-Za-z0-9_-]+)\.(tsx|ts|jsx|js)$/.exec(e.name);
      if(m) out.push(m[1]);
    }else if(e.isDirectory()){
      const ix = ["index.tsx","index.ts","index.jsx","index.js"].find(f=>fs.existsSync(path.join(p,f)));
      if(ix) out.push(e.name);
    }
  }
  return Array.from(new Set(out)).sort();
}
const segs = finalSegments();

// build a minimal tabs layout with each seg exactly once
function title(s){return s.replace(/[-_]/g," ").replace(/\b\w/g,c=>c.toUpperCase());}
let initial = segs.includes("ask") ? "ask" : (segs.includes("account") ? "account" : (segs[0]||"account"));

const layoutSrc = `import { Tabs } from "expo-router";
export default function TabsLayout(){
  return (
    <Tabs initialRouteName="${initial}" screenOptions={{ headerShown:false }}>
${segs.map(s=>`      <Tabs.Screen name="${s}" options={{ title: "${title(s)}" }} />`).join("\n")}
    </Tabs>
  );
}
`;
fs.writeFileSync(path.join(tabsDir,"_layout.tsx"),layoutSrc);
console.log("Tabs:",segs.join(", ")||"(none)");
console.log("initialRouteName:",initial);
