import fs from "fs";
import path from "path";
const dir = "app/constants/flashcards";
const files = fs.readdirSync(dir).filter(f=>f.endsWith(".json"));
const toTitle = s=>s.replace(/_/g," ").replace(/\b([a-z])/g,(_,c)=>c.toUpperCase()).replace(/\bAp\b/g,"AP").replace(/\bUs\b/g,"US").replace(/\bIi\b/g,"II").replace(/\bIii\b/g,"III").trim();
const mapDisplay = {};
for(const f of files){
  const p = path.join(dir,f);
  let raw = fs.readFileSync(p,"utf8");
  let arr;
  try{ arr = JSON.parse(raw);}catch{ continue;}
  const seen = new Set();
  const clean = [];
  for(const qa of arr){
    const q = (qa.question||"").toString().trim().replace(/\s+/g," ");
    const a = (qa.answer||"").toString().trim().replace(/\s+/g," ");
    const key = (q+"|||"+a).toLowerCase();
    if(q && a && !seen.has(key)){ seen.add(key); clean.push({question:q,answer:a}); }
  }
  fs.writeFileSync(p,JSON.stringify(clean.slice(0,20),null,2));
  const base = path.basename(f,".json");
  mapDisplay[base] = toTitle(base);
}
fs.writeFileSync(path.join(dir,"topic_labels.json"),JSON.stringify(mapDisplay,null,2));
