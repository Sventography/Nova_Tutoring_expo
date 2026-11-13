const fs=require('fs');
const path='app/data/flashcards.json';
const data=JSON.parse(fs.readFileSync(path,'utf8'));
const have=new Set((data.topics||[]).map(t=>t.title));

const topics=[
 "World History","US History","European History","Asian History","African History",
 "Chemistry Basics","Organic Chemistry","Biochemistry","Astronomy","Geology",
 "Environmental Science","Computer Networks","Databases","Operating Systems","Cybersecurity",
 "Artificial Intelligence","Machine Learning","Data Science","Web Development","Mobile Development"
];

function gen(title){
  const cards=[];
  for(let i=1;i<=20;i++){
    cards.push({q:`${title}: Question ${i}`,a:`${title}: Answer ${i}`});
  }
  return {title, cards};
}

const add=topics.filter(t=>!have.has(t)).map(gen);
data.topics=(data.topics||[]).concat(add);
fs.writeFileSync(path,JSON.stringify(data,null,2));
console.log(`Appended ${add.length} topics with 20 questions each`);
