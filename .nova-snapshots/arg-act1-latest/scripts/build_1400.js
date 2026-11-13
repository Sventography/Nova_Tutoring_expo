const fs=require('fs');
const titles=[
"Algebra Basics","Linear Equations","Quadratics","Polynomials","Functions",
"Geometry Basics","Triangles","Circles","Coordinate Geometry","Trigonometry",
"Calculus Limits","Derivatives","Integrals","Series","Differential Equations",
"Physics Mechanics","Waves & Sound","Electricity & Magnetism","Optics","Modern Physics",
"Chemistry Atoms","Periodic Table","Bonding","Stoichiometry","Acids & Bases",
"Biology Cells","Genetics","Evolution","Human Anatomy","Ecology",
"World History I","World History II","US History I","US History II","Civics",
"Geography World","Geography Maps","Earth Science","Astronomy","Environmental Science",
"CS Basics","Data Structures","Algorithms","Databases","Networking",
"JavaScript","Python","Java","C++","Swift",
"HTML/CSS","React","React Native","APIs & REST","Git & GitHub",
"Statistics Descriptive","Probability","Statistical Inference","Linear Algebra","Discrete Math",
"Spanish Basics","French Basics","German Basics","Italian Basics","Japanese Basics",
"Spanish Advanced","French Advanced","German Advanced","Italian Advanced","Japanese Advanced"
];
function genCards(title){
  const out=[];
  for(let i=1;i<=20;i++){
    let q=`${title}: Question ${i}`;
    let a=`${title}: Answer ${i}`;
    if(title==="JavaScript"&&i===1){q="JS: What does '===' do?";a="Strict equality";}
    if(title==="Python"&&i===1){q="Python: What is a list comprehension?";a="Compact list construction";}
    if(title==="Japanese Basics"&&i<=20){
      const pairs=[["Hello","こんにちは"],["Thank you","ありがとう"],["Yes","はい"],["No","いいえ"],["Water","水"],["Food","食べ物"],["Bathroom","トイレ"],["Help","助けて"],["Where?","どこ"],["When?","いつ"],["Why?","なぜ"],["Because","だから"],["Train station","駅"],["Ticket","切符"],["Hotel","ホテル"],["Left","左"],["Right","右"],["Straight","まっすぐ"],["Open","開く"],["Close","閉める"]];
      q=`Japanese: Translate "${pairs[i-1][0]}"`;a=pairs[i-1][1];
    }
    out.push({q,a});
  }
  return out;
}
const data={topics: titles.map(t=>({title:t,cards:genCards(t)}))};
fs.writeFileSync('app/data/flashcards.json',JSON.stringify(data,null,2));
console.log('written topics:',data.topics.length,'cards:',data.topics.reduce((s,t)=>s+t.cards.length,0));
