const fs=require('fs'),p='app/data/flashcards.json';
if(!fs.existsSync(p)) fs.writeFileSync(p,JSON.stringify({topics:[]},null,2));
const d=JSON.parse(fs.readFileSync(p,'utf8'));
function U(title,pairs){const i=(d.topics||[]).findIndex(t=>t.title===title);const cards=pairs.map(([q,a])=>({q,a}));if(i>=0)d.topics[i]={title,cards};else(d.topics||(d.topics=[])).push({title,cards});}

U("World Literature",[
["Author of The Odyssey","Homer"],
["Author of One Hundred Years of Solitude","Gabriel García Márquez"],
["Author of Crime and Punishment","Fyodor Dostoevsky"],
["Author of The Divine Comedy","Dante Alighieri"],
["Author of Don Quixote","Miguel de Cervantes"],
["Author of The Metamorphosis","Franz Kafka"],
["Author of The Trial","Franz Kafka"],
["Author of The Stranger","Albert Camus"],
["Author of Faust","Johann Wolfgang von Goethe"],
["Author of The Name of the Rose","Umberto Eco"],
["Author of Things Fall Apart","Chinua Achebe"],
["Author of The Tale of Genji","Murasaki Shikibu"],
["Author of The Kite Runner","Khaled Hosseini"],
["Author of In Search of Lost Time","Marcel Proust"],
["Author of The Brothers Karamazov","Fyodor Dostoevsky"],
["Author of War and Peace","Leo Tolstoy"],
["Author of The Old Man and the Sea","Ernest Hemingway"],
["Author of The Master and Margarita","Mikhail Bulgakov"],
["Author of Madame Bovary","Gustave Flaubert"],
["Author of The Little Prince","Antoine de Saint-Exupéry"]
]);

U("Environmental Science",[
["Greenhouse gas with highest concentration","Carbon dioxide"],
["Main cause of ozone depletion","Chlorofluorocarbons"],
["Process converting nitrogen gas to ammonia","Nitrogen fixation"],
["Trophic level of herbivores","Primary consumers"],
["Biomagnification definition","Increase of toxin concentration up food chain"],
["Eutrophication cause","Nutrient runoff"],
["Sustainable yield meaning","Harvest without depleting resource"],
["Carbon sink example","Forests"],
["Biodiversity hotspot trait","High endemism and threat"],
["Primary succession starts on","Bare rock"],
["Keystone species effect","Disproportionate ecosystem impact"],
["Photovoltaic converts","Light to electricity"],
["PM2.5 refers to","Fine particulate matter"],
["LEED relates to","Green building certification"],
["Carrying capacity","Max population environment supports"],
["Waste management hierarchy","Reduce reuse recycle recover dispose"],
["Climate vs weather","Long-term patterns vs short-term conditions"],
["Kyoto Protocol focus","Greenhouse gas reduction"],
["Paris Agreement aim","Limit warming to 1.5–2°C"],
["Life-cycle assessment","Cradle-to-grave impact analysis"]
]);

U("Music Theory",[
["Major scale step pattern","W W H W W W H"],
["Perfect fifth interval","7 semitones"],
["Minor third interval","3 semitones"],
["Triad tones","Root third fifth"],
["Dominant chord in C major","G7"],
["Relative minor of C major","A minor"],
["Key signature with 1 sharp","G major"],
["Circle of fifths purpose","Key relationships"],
["Tempo marking adagio","Slow"],
["Tempo marking allegro","Fast"],
["Time signature 3/4","Three quarter-note beats"],
["Syncopation meaning","Accents off the beat"],
["Cadence V–I","Authentic cadence"],
["Diatonic means","Within the key"],
["Chromatic scale","All 12 semitones"],
["Interval inversion of 3rd","6th"],
["Tonic function","Home chord"],
["Subdominant in C","F"],
["Leading tone in C","B"],
["Mode Dorian start","Second degree of major scale"]
]);

U("Business Management",[
["SWOT stands for","Strengths Weaknesses Opportunities Threats"],
["SMART goals","Specific Measurable Achievable Relevant Time-bound"],
["KPIs are","Key performance indicators"],
["Lean focuses on","Eliminating waste"],
["Six Sigma goal","Reduce defects and variation"],
["Break-even point","Revenue equals total costs"],
["Stakeholder definition","Anyone affected by outcomes"],
["Change management purpose","Guide organizational transitions"],
["OKR stands for","Objectives and Key Results"],
["Porter’s Five Forces","Industry competitive analysis"],
["Agile emphasizes","Iterative delivery and feedback"],
["Waterfall is","Sequential project phases"],
["Balanced scorecard","Multi-perspective performance tool"],
["Cash flow statement shows","Cash in and out"],
["Net profit formula","Revenue − expenses"],
["Liquidity ratio example","Current ratio"],
["Market segmentation","Divide customers into groups"],
["USP meaning","Unique selling proposition"],
["Benchmarking","Compare to best-in-class"],
["Churn rate","Customer attrition rate"]
]);

U("Japanese Kanji I",[
["日 meaning/reading","Sun; にち・ひ"],
["月 meaning/reading","Moon; げつ・つき"],
["火 meaning/reading","Fire; か・ひ"],
["水 meaning/reading","Water; すい・みず"],
["木 meaning/reading","Tree; もく・き"],
["金 meaning/reading","Gold; きん・かね"],
["土 meaning/reading","Earth; ど・つち"],
["山 meaning/reading","Mountain; さん・やま"],
["川 meaning/reading","River; かわ"],
["田 meaning/reading","Rice field; た・だ"],
["人 meaning/reading","Person; にん・ひと"],
["口 meaning/reading","Mouth; くち"],
["目 meaning/reading","Eye; め"],
["耳 meaning/reading","Ear; みみ"],
["手 meaning/reading","Hand; て"],
["足 meaning/reading","Foot; あし"],
["力 meaning/reading","Power; ちから"],
["女 meaning/reading","Woman; おんな"],
["男 meaning/reading","Man; おとこ"],
["子 meaning/reading","Child; こ"]
]);

fs.writeFileSync(p,JSON.stringify(d,null,2));
console.log('topics_total',d.topics.length,'cards_total',d.topics.reduce((s,t)=>s+t.cards.length,0));
