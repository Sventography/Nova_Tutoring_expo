import fs from "fs";import path from "path";
const dir="app/constants/flashcards";
const labelFile=path.join(dir,"topic_labels.json");
const labels=fs.existsSync(labelFile)?JSON.parse(fs.readFileSync(labelFile,"utf8")):{};
const files=fs.readdirSync(dir).filter(f=>f.endsWith(".json")&&f!=="topic_labels.json");
const topics=files.map(f=>{const k=f.replace(/\.json$/,"");const t=labels[k]||k.replace(/_/g," ").replace(/\b([a-z])/g,(_,c)=>c.toUpperCase()).replace(/\bAp\b/g,"AP").replace(/\bUs\b/g,"US");const n=JSON.parse(fs.readFileSync(path.join(dir,f),"utf8")).length;return {key:k,title:t,questions:n};});
const subj=(t)=>{const s=t.toLowerCase();if(s.includes("algebra")||s.includes("geometry")||s.includes("calculus")||s.includes("trigonometry")||s.includes("statistics")||s.includes("discrete")||s.includes("linear algebra"))return"Math";
if(s.includes("physics"))return"Physics";
if(s.includes("chem"))return"Chemistry";
if(s.includes("bio"))return"Biology";
if(s.includes("astro"))return"Astronomy";
if(s.includes("cs ")||s.startsWith("computer ")||s.includes("algorithms")||s.includes("data structure")||s.includes("network")||s.includes("cyber"))return"Computer Science";
if(s.includes("history")||s.includes("government")||s.includes("civics")||s.includes("world religions")||s.includes("geography"))return"Social Studies";
if(s.includes("economics")||s.includes("finance")||s.includes("business"))return"Economics/Business";
if(s.includes("english")||s.includes("writing")||s.includes("literature")||s.includes("poetry")||s.includes("sat reading"))return"English/ELA";
if(s.includes("french")||s.includes("spanish")||s.includes("german")||s.includes("italian")||s.includes("japanese"))return"Languages";
if(s.includes("art")||s.includes("music"))return"Arts";
if(s.includes("anatomy")||s.includes("physiology")||s.includes("health")||s.includes("nutrition"))return"Health";
if(s.includes("environment"))return"Environmental Science";
if(s.includes("psych"))return"Psychology";
if(s.includes("sociology")||s.includes("anthropology")||s.includes("philosophy"))return"Humanities";
return"Other";}
const categories={};
for(const t of topics){const c=subj(t.title);if(!categories[c])categories[c]=[];categories[c].push({key:t.key,title:t.title,questions:t.questions});}
fs.writeFileSync(path.join(dir,"catalog.json"),JSON.stringify({topics,categories},null,2));
console.log("catalog.json written with",topics.length,"topics and",Object.keys(categories).length,"categories");
