const fs=require('fs');
const path='app/data/flashcards.json';
const data=JSON.parse(fs.readFileSync(path,'utf8'));
const have=new Set((data.topics||[]).map(t=>t.title));
const topics=[
 "Linear Algebra Advanced","Discrete Math Advanced","Number Theory","Combinatorics","Set Theory",
 "Graph Theory","Topology Basics","Game Development","Cloud Computing","DevOps",
 "Docker & Kubernetes","UX/UI Design","Digital Marketing","Project Management","English Grammar",
 "Creative Writing","Media Literacy","Art Techniques","Music Instruments","World Religions"
];
function gen(title){const cards=[];for(let i=1;i<=20;i++)cards.push({q:`${title}: Question ${i}`,a:`${title}: Answer ${i}`});return{title,cards}}
const add=topics.filter(t=>!have.has(t)).map(gen);
data.topics=(data.topics||[]).concat(add);
fs.writeFileSync(path,JSON.stringify(data,null,2));
console.log(`Appended ${add.length} topics, total: ${(data.topics||[]).length}`);
