const fs=require('fs'),p='app/data/flashcards.json';
const data=JSON.parse(fs.readFileSync(p,'utf8'));
const badRe=/(^|\s)(placeholder|tbd|lorem|example|sample|dummy)(\s|$)/i;
const weakRe=/^(\.\.\.|-|—|n\/a|null|undefined|\?)$/i;
function isPlaceholder(s){ if(!s) return true; const t=String(s).trim(); if(t.length<2) return true; if(badRe.test(t)) return true; if(weakRe.test(t)) return true; return false }
const topics=(data.topics||[]).map(t=>{
  const cards=(t.cards||[]).map(c=>({q:String(c.q??c.front??''),a:String(c.a??c.back??'')}));
  const total=cards.length;
  const placeholders=cards.filter(c=>isPlaceholder(c.q)||isPlaceholder(c.a)).length;
  const real=total-placeholders;
  return {title:String(t.title||'Untitled'),total,real,placeholders}
});
topics.sort((a,b)=>a.title.localeCompare(b.title));
const sum=topics.reduce((s,t)=>{s.total+=t.total;s.real+=t.real;s.placeholders+=t.placeholders;return s},{total:0,real:0,placeholders:0});
console.table(topics);
console.log('SUMMARY',sum);
