const fs=require('fs'),p='app/data/flashcards.json';
const data=JSON.parse(fs.readFileSync(p,'utf8'));
const badRe=/(^|\s)(placeholder|tbd|lorem|example|sample|dummy)(\s|$)/i;
const weakRe=/^(\.\.\.|-|—|n\/a|null|undefined|\?)$/i;
function isPlaceholder(s){ if(!s) return true; const t=String(s).trim(); if(t.length<2) return true; if(badRe.test(t)) return true; if(weakRe.test(t)) return true; return false }
const strong=[];
for(const t of (data.topics||[])){
  const cards=(t.cards||[]).map(c=>({q:String(c.q??c.front??''),a:String(c.a??c.back??'')}));
  const real=cards.filter(c=>!(isPlaceholder(c.q)||isPlaceholder(c.a)));
  if(real.length>=15) strong.push({title:String(t.title||'Untitled'),cards:real});
}
fs.writeFileSync(p,JSON.stringify({topics:strong},null,2));
console.log('topics_after',strong.length,'cards_after',strong.reduce((s,t)=>s+t.cards.length,0));
