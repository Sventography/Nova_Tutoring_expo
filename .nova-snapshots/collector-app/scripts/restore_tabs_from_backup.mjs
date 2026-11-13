import fs from "fs";
import path from "path";

const tabsDir = path.join("app","(tabs)");
const qDir = path.join("app","_quarantine");

// find latest tabs_backup_* folder
if (!fs.existsSync(qDir)) { console.error("No _quarantine dir found."); process.exit(1); }
const backups = fs.readdirSync(qDir)
  .filter(n => n.startsWith("tabs_backup_"))
  .map(n => ({ name:n, p:path.join(qDir,n), t: fs.statSync(path.join(qDir,n)).mtimeMs }))
  .sort((a,b)=>b.t-a.t);

if (backups.length===0) { console.error("No tabs_backup_* folder found in", qDir); process.exit(1); }
const backup = backups[0].p;

fs.mkdirSync(tabsDir, { recursive:true });

// helper: list top-level segments in a tabs folder
function listSegments(dir){
  if (!fs.existsSync(dir)) return [];
  const ents = fs.readdirSync(dir, { withFileTypes:true });
  const out = new Set();
  for (const e of ents) {
    if (e.isFile()) {
      const m = /^([A-Za-z0-9_-]+)\.(tsx|ts|jsx|js)$/.exec(e.name);
      if (m) out.add(m[1]);
    } else if (e.isDirectory()) {
      for (const ext of ["tsx","ts","jsx","js"]) {
        if (fs.existsSync(path.join(dir, e.name, `index.${ext}`))) { out.add(e.name); break; }
      }
    }
  }
  return [...out].sort();
}

function pickCandidate(dir, seg){
  // prefer file seg.tsx/ts, else folder index
  for (const ext of ["tsx","ts","jsx","js"]) {
    const f = path.join(dir, `${seg}.${ext}`);
    if (fs.existsSync(f)) return { type:"file", src:f };
  }
  if (fs.existsSync(path.join(dir, seg))) {
    for (const ext of ["tsx","ts","jsx","js"]) {
      const ix = path.join(dir, seg, `index.${ext}`);
      if (fs.existsSync(ix)) return { type:"dir", src:path.join(dir, seg) };
    }
  }
  return null;
}

function existsSeg(dir, seg){
  for (const ext of ["tsx","ts","jsx","js"]) {
    if (fs.existsSync(path.join(dir, `${seg}.${ext}`))) return true;
  }
  if (fs.existsSync(path.join(dir, seg))) {
    for (const ext of ["tsx","ts","jsx","js"]) {
      if (fs.existsSync(path.join(dir, seg, `index.${ext}`))) return true;
    }
  }
  return false;
}

function copyRec(src, dst){
  const st = fs.statSync(src);
  if (st.isDirectory()){
    fs.mkdirSync(dst, { recursive:true });
    for (const n of fs.readdirSync(src)) copyRec(path.join(src,n), path.join(dst,n));
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive:true });
    fs.copyFileSync(src, dst);
  }
}

const currentSegs = new Set(listSegments(tabsDir));
const backupSegs  = listSegments(backup);

// restore ASK from backup, overwriting placeholder if present
if (backupSegs.includes("ask")) {
  const cand = pickCandidate(backup, "ask");
  if (cand) {
    // always overwrite ask to restore your real file/folder
    if (cand.type==="file") copyRec(cand.src, path.join(tabsDir, path.basename(cand.src)));
    else copyRec(cand.src, path.join(tabsDir, "ask"));
    currentSegs.add("ask");
    console.log("Restored ask from backup.");
  }
}

// handle ACCOUNT: ensure exactly one
if (!existsSeg(tabsDir, "account") && backupSegs.includes("account")) {
  const cand = pickCandidate(backup, "account");
  if (cand) {
    if (cand.type==="file") copyRec(cand.src, path.join(tabsDir, path.basename(cand.src)));
    else copyRec(cand.src, path.join(tabsDir, "account"));
    currentSegs.add("account");
    console.log("Restored one account from backup.");
  }
} else {
  console.log("Keeping existing account in tabs (not duplicating).");
}

// restore all other segments from backup if missing
for (const seg of backupSegs) {
  if (seg==="ask" || seg==="account") continue;
  if (existsSeg(tabsDir, seg)) continue;
  const cand = pickCandidate(backup, seg);
  if (!cand) continue;
  if (cand.type==="file") copyRec(cand.src, path.join(tabsDir, path.basename(cand.src)));
  else copyRec(cand.src, path.join(tabsDir, seg));
  currentSegs.add(seg);
  console.log("Restored", seg);
}

// recompute final segs
const finalSegs = listSegments(tabsDir);

// write clean Tabs layout
function title(s){return s.replace(/[-_]/g," ").replace(/\b\w/g,c=>c.toUpperCase());}
const initial = finalSegs.includes("ask") ? "ask" : (finalSegs[0] || "account");
const layout = `import { Tabs } from "expo-router";
export default function TabsLayout(){
  return (
    <Tabs initialRouteName="${initial}" screenOptions={{ headerShown:false }}>
${finalSegs.map(s=>`      <Tabs.Screen name="${s}" options={{ title: "${title(s)}" }} />`).join("\n")}
    </Tabs>
  );
}
`;
fs.writeFileSync(path.join(tabsDir, "_layout.tsx"), layout);

console.log("Final tabs:", finalSegs.join(", ") || "(none)");
console.log("initialRouteName:", initial);
