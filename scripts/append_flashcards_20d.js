const fs=require('fs');
const path='app/data/flashcards.json';
const data=JSON.parse(fs.readFileSync(path,'utf8'));
const have=new Set((data.topics||[]).map(t=>t.title));
const topics=[
 "Chemistry Atoms","Chemistry Bonds","Chemistry Reactions","Chemistry Acids Bases","Chemistry Organic",
 "Chemistry Inorganic","Environmental Science","Earth Science","Astronomy Stars","Astronomy Planets",
 "Health Nutrition","Health Exercise","Health Mental","Medicine Basics","First Aid",
 "Business Finance","Business Economics","Entrepreneurship","Accounting","Investing"
];
function gen(title){const cards=[];for(let i=1;i<=20;i++)cards.push({q:`${title}: Question ${i}`,a:`${title}: Answer ${i}`});return{title,cards}}
const add=topics.filter(t=>!have.has(t)).map(gen);
data.topics=(data.topics||[]).concat(add);
fs.writeFileSync(path,JSON.stringify(data,null,2));
console.log(`Appended ${add.length} topics, total: ${(data.topics||[]).length}`);
