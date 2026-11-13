const fs=require('fs');
const path='app/data/flashcards.json';
const data=JSON.parse(fs.readFileSync(path,'utf8'));
const have=new Set((data.topics||[]).map(t=>t.title));
const topics=[
 "French Basics","French Grammar","French Vocabulary","French Phrases","French Culture",
 "Spanish Basics","Spanish Grammar","Spanish Vocabulary","Spanish Phrases","Spanish Culture",
 "German Basics","German Grammar","German Vocabulary","German Phrases","German Culture",
 "Italian Basics","Italian Grammar","Italian Vocabulary","Italian Phrases","Italian Culture"
];
function gen(title){const cards=[];for(let i=1;i<=20;i++)cards.push({q:`${title}: Question ${i}`,a:`${title}: Answer ${i}`});return{title,cards}}
const add=topics.filter(t=>!have.has(t)).map(gen);
data.topics=(data.topics||[]).concat(add);
fs.writeFileSync(path,JSON.stringify(data,null,2));
console.log(`Appended ${add.length} language topics, total: ${(data.topics||[]).length}`);
