const fs=require('fs');
const path='app/data/flashcards.json';
const data=JSON.parse(fs.readFileSync(path,'utf8'));
const have=new Set((data.topics||[]).map(t=>t.title));

const topics=[
  "Art History","Music Theory","Economics Micro","Economics Macro","Finance Basics",
  "Psychology","Sociology","Philosophy","Literature","Health & Nutrition"
];

function gen(title){
  const cards=[];
  for(let i=1;i<=20;i++){
    let q=`${title}: Q${i}`;
    let a=`A${i}`;
    if(title==="Art History"){
      const qs=["Renaissance","Baroque","Impressionism","Cubism","Surrealism","Realism","Romanticism","Gothic","Neoclassicism","Futurism","Dada","Pop Art","Abstract","Post-Impressionism","Expressionism","Rococo","Minimalism","Contemporary","Mannerism","Byzantine"];
      q=`Art: Define ${qs[i-1]}`; a=`Definition of ${qs[i-1]}`;
    } else if(title==="Music Theory"){
      const qs=["Scale","Interval","Chord","Triad","Seventh chord","Key signature","Time signature","Tempo","Dynamics","Harmony","Melody","Rhythm","Cadence","Mode","Transposition","Counterpoint","Timbre","Texture","Arpeggio","Modulation"];
      q=`Music: Define ${qs[i-1]}`; a=`Definition of ${qs[i-1]}`;
    } else if(title==="Economics Micro"){
      const qs=["Demand","Supply","Equilibrium","Elasticity","Opportunity cost","Marginal utility","Diminishing returns","Price ceiling","Price floor","Consumer surplus","Producer surplus","Market failure","Externality","Public goods","Monopoly","Oligopoly","Perfect competition","Game theory","Cost curves","Profit maximization"];
      q=`Micro: Define ${qs[i-1]}`; a=`Definition of ${qs[i-1]}`;
    } else if(title==="Economics Macro"){
      const qs=["GDP","Inflation","Unemployment","Fiscal policy","Monetary policy","Aggregate demand","Aggregate supply","Business cycle","Interest rate","Exchange rate","Balance of payments","Budget deficit","Crowding out","Phillips curve","Stagflation","Output gap","Okun's law","Quantity theory","Taylor rule","Multipliers"];
      q=`Macro: Define ${qs[i-1]}`; a=`Definition of ${qs[i-1]}`;
    } else if(title==="Finance Basics"){
      const qs=["Asset","Liability","Equity","Revenue","Expense","Cash flow","Net income","Balance sheet","Income statement","ROE","ROI","NPV","IRR","Discount rate","Compound interest","Risk","Diversification","ETF","Bond","Stock"];
      q=`Finance: Define ${qs[i-1]}`; a=`Definition of ${qs[i-1]}`;
    } else if(title==="Psychology"){
      const qs=["Classical conditioning","Operant conditioning","Memory","Attention","Perception","Cognition","Emotion","Motivation","Personality","Development","Attachment","Learning","Bias","Heuristic","Neurotransmitter","Stress","Mental disorder","Therapy","Intelligence","Social influence"];
      q=`Psychology: Define ${qs[i-1]}`; a=`Definition of ${qs[i-1]}`;
    } else if(title==="Sociology"){
      const qs=["Culture","Norm","Value","Role","Institution","Socialization","Deviance","Stratification","Class","Race","Gender","Ethnicity","Power","Authority","Social change","Urbanization","Globalization","Network","Group","Identity"];
      q=`Sociology: Define ${qs[i-1]}`; a=`Definition of ${qs[i-1]}`;
    } else if(title==="Philosophy"){
      const qs=["Epistemology","Metaphysics","Ethics","Aesthetics","Logic","Skepticism","Utilitarianism","Deontology","Virtue ethics","Determinism","Free will","Dualism","Monism","Empiricism","Rationalism","Existentialism","Phenomenology","Pragmatism","Relativism","Nihilism"];
      q=`Philosophy: Define ${qs[i-1]}`; a=`Definition of ${qs[i-1]}`;
    } else if(title==="Literature"){
      const qs=["Theme","Motif","Symbol","Metaphor","Simile","Alliteration","Irony","Foreshadowing","Allegory","Point of view","Narrator","Protagonist","Antagonist","Tone","Diction","Genre","Plot","Climax","Denouement","Setting"];
      q=`Literature: Define ${qs[i-1]}`; a=`Definition of ${qs[i-1]}`;
    } else if(title==="Health & Nutrition"){
      const qs=["Macronutrient","Micronutrient","Protein","Carbohydrate","Fat","Fiber","Vitamin","Mineral","Hydration","Calorie","Metabolism","BMI","Basal rate","Glycemic index","Antioxidant","Probiotic","Omega-3","Sodium","Potassium","Calcium"];
      q=`Health: Define ${qs[i-1]}`; a=`Definition of ${qs[i-1]}`;
    }
    cards.push({q,a});
  }
  return {title, cards};
}

const add=topics.filter(t=>!have.has(t)).map(gen);
data.topics=(data.topics||[]).concat(add);
fs.writeFileSync(path,JSON.stringify(data,null,2));
console.log(`Appended ${add.length} topics`);
