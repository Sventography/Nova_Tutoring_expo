const fs=require('fs');
const path='app/data/flashcards.json';
const data=JSON.parse(fs.readFileSync(path,'utf8'));
const have=new Set((data.topics||[]).map(t=>t.title));
const topics=[
 "Ancient Civilizations","Medieval Europe","Renaissance","Industrial Revolution","Modern World History",
 "US Government","US Civil Rights","World Wars","Cold War","Globalization",
 "Biology Genetics","Biology Evolution","Human Anatomy","Plant Biology","Ecology",
 "Physics Mechanics","Physics Thermodynamics","Physics Optics","Physics Quantum","Physics Relativity"
];
function gen(title){const cards=[];for(let i=1;i<=20;i++)cards.push({q:`${title}: Question ${i}`,a:`${title}: Answer ${i}`});return{title,cards}}
const add=topics.filter(t=>!have.has(t)).map(gen);
data.topics=(data.topics||[]).concat(add);
fs.writeFileSync(path,JSON.stringify(data,null,2));
console.log(`Appended ${add.length} topics, total: ${(data.topics||[]).length}`);
