const fs=require('fs');

const topics=[
  "Algebra Basics","Linear Equations","Quadratics","Polynomials","Functions",
  "Geometry Basics","Triangles","Circles","Coordinate Geometry","Trigonometry",
  "Calculus Limits","Derivatives","Integrals","Series","Differential Equations",
  "Physics Mechanics","Waves & Sound","Electricity & Magnetism","Optics","Modern Physics",
  "Chemistry Atoms","Periodic Table","Bonding","Stoichiometry","Acids & Bases",
  "Biology Cells","Genetics","Evolution","Human Anatomy","Ecology",
  "World History I","World History II","US History I","US History II","Civics",
  "Geography World","Geography Maps","Earth Science","Astronomy","Environmental Science",
  "Computer Science Basics","Data Structures","Algorithms","Databases","Networking",
  "Programming JavaScript","Programming Python","Programming Java","Programming C++","Programming Swift",
  "Web HTML/CSS","Web React","Mobile React Native","APIs & REST","Git & GitHub",
  "Statistics Descriptive","Statistics Probability","Statistics Inference","Linear Algebra","Discrete Math",
  "Spanish Basics","French Basics","German Basics","Italian Basics","Japanese Basics",
  "Spanish Advanced","French Advanced","German Advanced","Italian Advanced","Japanese Advanced"
];

function genCards(title){
  const cards=[];
  for(let i=1;i<=20;i++){
    let q=`${title}: Q${i}`;
    let a=`A${i}`;
    if(title.startsWith("Programming JavaScript")){
      q=`JS: What does '===' do? #${i}`;
      a="Strict equality check";
    }
    else if(title.startsWith("Programming Python")){
      q=`Python: What is a list comprehension? #${i}`;
      a="Compact syntax to build lists";
    }
    else if(title.startsWith("Spanish Basics")){
      const pairs=[["Hello","Hola"],["Goodbye","Adiós"],["Please","Por favor"],["Thank you","Gracias"],["Yes","Sí"],["No","No"],["Excuse me","Perdón"],["Good morning","Buenos días"],["Good night","Buenas noches"],["How are you?","¿Cómo estás?"],["Water","Agua"],["Food","Comida"],["Bathroom","Baño"],["Help","Ayuda"],["I want","Quiero"],["I like","Me gusta"],["Where?","¿Dónde?"],["When?","¿Cuándo?"],["Why?","¿Por qué?"],["Because","Porque"]];
      const [en,es]=pairs[i-1];
      q=`Spanish: Translate "${en}"`;
      a=es;
    }
    else if(title.startsWith("French Basics")){
      const pairs=[["Hello","Bonjour"],["Goodbye","Au revoir"],["Please","S’il vous plaît"],["Thank you","Merci"],["Yes","Oui"],["No","Non"],["Excuse me","Pardon"],["Good morning","Bonjour"],["Good night","Bonne nuit"],["How are you?","Ça va ?"],["Water","Eau"],["Food","Nourriture"],["Bathroom","Toilettes"],["Help","Aide"],["I want","Je veux"],["I like","J’aime"],["Where?","Où ?"],["When?","Quand ?"],["Why?","Pourquoi ?"],["Because","Parce que"]];
      const [en,fr]=pairs[i-1];
      q=`French: Translate "${en}"`;
      a=fr;
    }
    else if(title.startsWith("German Basics")){
      const pairs=[["Hello","Hallo"],["Goodbye","Tschüss"],["Please","Bitte"],["Thank you","Danke"],["Yes","Ja"],["No","Nein"],["Excuse me","Entschuldigung"],["Good morning","Guten Morgen"],["Good night","Gute Nacht"],["How are you?","Wie geht’s?"],["Water","Wasser"],["Food","Essen"],["Bathroom","Toilette"],["Help","Hilfe"],["I want","Ich will"],["I like","Ich mag"],["Where?","Wo?"],["When?","Wann?"],["Why?","Warum?"],["Because","Weil"]];
      const [en,de]=pairs[i-1];
      q=`German: Translate "${en}"`;
      a=de;
    }
    else if(title.startsWith("Italian Basics")){
      const pairs=[["Hello","Ciao"],["Goodbye","Arrivederci"],["Please","Per favore"],["Thank you","Grazie"],["Yes","Sì"],["No","No"],["Excuse me","Scusa"],["Good morning","Buongiorno"],["Good night","Buonanotte"],["How are you?","Come stai?"],["Water","Acqua"],["Food","Cibo"],["Bathroom","Bagno"],["Help","Aiuto"],["I want","Voglio"],["I like","Mi piace"],["Where?","Dove?"],["When?","Quando?"],["Why?","Perché?"],["Because","Perché"]];
      const [en,it]=pairs[i-1];
      q=`Italian: Translate "${en}"`;
      a=it;
    }
    else if(title.startsWith("Japanese Basics")){
      const pairs=[["Hello","こんにちは"],["Goodbye","さようなら"],["Please","お願いします"],["Thank you","ありがとう"],["Yes","はい"],["No","いいえ"],["Excuse me","すみません"],["Good morning","おはよう"],["Good night","おやすみ"],["How are you?","元気ですか"],["Water","水"],["Food","食べ物"],["Bathroom","トイレ"],["Help","助けて"],["I want","欲しい"],["I like","好きです"],["Where?","どこ"],["When?","いつ"],["Why?","なぜ"],["Because","だから"]];
      const [en,ja]=pairs[i-1];
      q=`Japanese: Translate "${en}"`;
      a=ja;
    }
    else if(title.startsWith("Statistics")){
      const qs=["Mean","Median","Mode","Variance","Std Dev","Z-score","p-value","Confidence Interval","Normal Dist","Binomial Dist","Poisson Dist","t-test","Chi-square","ANOVA","Correlation","Regression","Outlier","Sample vs Pop","Bias","Random Var"];
      q=`Statistics: Define ${qs[i-1]}`;
      a=`Definition of ${qs[i-1]}`;
    }
    else if(title==="Linear Algebra"){
      const qs=["Vector","Matrix","Determinant","Eigenvalue","Eigenvector","Rank","Null Space","Column Space","Row Space","Orthogonality","Dot Product","Cross Product","Projection","Basis","Dimension","Linear Combo","Linear Independence","Inverse Matrix","LU Decomposition","SVD"];
      q=`Linear Algebra: Define ${qs[i-1]}`;
      a=`Definition of ${qs[i-1]}`;
    }
    else if(title==="Discrete Math"){
      const qs=["Set","Subset","Function","Relation","Graph","Tree","Permutation","Combination","Pigeonhole","Induction","Recurrence","Big-O","Boolean Algebra","Logic AND","Logic OR","Implication","Bijection","Injection","Surjection","Hamming Distance"];
      q=`Discrete Math: Define ${qs[i-1]}`;
      a=`Definition of ${qs[i-1]}`;
    }
    cards.push({q,a});
  }
  return cards;
}

const data={ topics: topics.map(t=>({ title:t, cards: genCards(t) })) };
fs.writeFileSync(0, JSON.stringify(data,null,2));
