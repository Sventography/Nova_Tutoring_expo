const fs=require('fs');
const T=(title,c)=>({title,cards:c.map(([q,a])=>({q,a}))});
const data=[
T("Japanese Basics",[
["Hello","こんにちは"],["Thank you","ありがとう"],["Yes","はい"],["No","いいえ"],["Good morning","おはよう"],["Good evening","こんばんは"],["Good night","おやすみ"],["Excuse me","すみません"],["I’m sorry","ごめんなさい"],["Please","お願いします"],["Water","水"],["Bathroom?","トイレはどこですか"],["How much?","いくらですか"],["I don’t understand","わかりません"],["Do you speak English?","英語を話せますか"]
]),
T("Japanese Travel",[
["Station","駅"],["Ticket","切符"],["Hotel","ホテル"],["Reservation","予約"],["Check-in","チェックイン"],["Check-out","チェックアウト"],["Left","左"],["Right","右"],["Straight","まっすぐ"],["Map","地図"],["Taxi","タクシー"],["Bus","バス"],["Train","電車"],["Airport","空港"],["Help!","助けて！"]
]),
T("Algebra Basics",[
["Solve 2x+6=14","x=4"],["Slope-intercept form","y=mx+b"],["Quadratic formula","x=(-b±√(b^2-4ac))/(2a)"],["FOIL stands for","First Outside Inside Last"],["Exponent rule a^m·a^n","a^(m+n)"],["Log base change","log_a(b)=log(b)/log(a)"],["Complete the square use","Convert to vertex form/solve"],["Discriminant b^2-4ac>0","Two real roots"],["Discriminant=0","One real root"],["Discriminant<0","Two complex roots"],["Function definition","Each input maps to one output"],["Domain","All allowed inputs"],["Range","All possible outputs"],["Arithmetic sequence diff d","a_n=a_1+(n-1)d"],["Geometric sequence ratio r","a_n=a_1·r^(n-1)"]
]),
T("Geometry Basics",[
["Sum of triangle angles","180°"],["Pythagorean theorem","a^2+b^2=c^2"],["Circle circumference","2πr"],["Circle area","πr^2"],["Area of triangle","(1/2)bh"],["Volume of sphere","(4/3)πr^3"],["Volume of cylinder","πr^2h"],["Parallel lines interior angles","Supplementary"],["Right triangle sinθ","opp/hyp"],["cosθ","adj/hyp"],["tanθ","opp/adj"],["Distance formula","√((x2-x1)^2+(y2-y1)^2)"],["Midpoint formula","((x1+x2)/2,(y1+y2)/2)"],["Polygon interior sum","(n-2)×180°"],["Heron’s formula","√(s(s-a)(s-b)(s-c))"]
]),
T("JavaScript Basics",[
["Strict equality","==="],["Declare constant","const"],["Array method add end","push"],["Remove end","pop"],["Arrow function","() => {}"],["Truthy/Falsy example","0 is falsy"],["JSON parse","JSON.parse"],["JSON stringify","JSON.stringify"],["Promise states","pending/fulfilled/rejected"],["async/await purpose","Await promises"],["map vs forEach","map returns new array"],["filter purpose","Keep items meeting condition"],["reduce purpose","Accumulate to single value"],["let vs var","let is block-scoped"],["NaN check","Number.isNaN(x)"]
]),
T("Python Basics",[
["List literal","[1,2,3]"],["Dict literal","{'a':1}"],["Set literal","{1,2,3}"],["Tuple literal","(1,2)"],["List comprehension","[x*x for x in a]"],["Function def","def f(): ..."],["Virtual env tool","venv"],["Package manager","pip"],["String format f-strings","f\"{x}\""],["None meaning","Null value"],["len('abc')","3"],["Slicing 'hello'[1:4]","'ell'"],["dict get default","d.get('k',0)"],["with open(...) as f","Context manager"],["Generator keyword","yield"]
]),
T("World Capitals",[
["Japan","Tokyo"],["France","Paris"],["Germany","Berlin"],["Italy","Rome"],["Spain","Madrid"],["Canada","Ottawa"],["Brazil","Brasília"],["Australia","Canberra"],["Egypt","Cairo"],["Kenya","Nairobi"],["India","New Delhi"],["China","Beijing"],["South Korea","Seoul"],["Mexico","Mexico City"],["United Kingdom","London"]
]),
T("Biology Basics",[
["Powerhouse of the cell","Mitochondria"],["Genetic material","DNA"],["DNA shape","Double helix"],["Protein factories","Ribosomes"],["Photosynthesis location","Chloroplast"],["Photosynthesis eq (words)","CO2+Water→Glucose+Oxygen+Light"],["Cell membrane model","Fluid mosaic"],["Osmosis","Water diffusion across membrane"],["Enzyme function","Lower activation energy"],["ATP role","Energy currency"],["Mitosis purpose","Divide into two identical cells"],["Meiosis purpose","Gamete formation"],["Homeostasis","Stable internal conditions"],["Prokaryote vs eukaryote","No nucleus vs nucleus"],["Gene","DNA segment coding a trait"]
]),
T("Chemistry Fundamentals",[
["Atomic number","Number of protons"],["Isotope","Same element, different neutrons"],["Ion","Charged atom/molecule"],["Ionic bond","Electron transfer"],["Covalent bond","Electron sharing"],["Polar bond","Unequal sharing"],["Mole","6.022×10^23 entities"],["Molarity","mol solute/L solution"],["Limiting reagent","Consumed first in reaction"],["Endothermic","Absorbs heat"],["Exothermic","Releases heat"],["Le Châtelier’s principle","System shifts to counter change"],["pH neutral","7"],["Acid vs base","Acid donates H+, base accepts H+"],["Redox","Oxidation+Reduction pair"]
]),
T("Physics Essentials",[
["Newton’s 1st law","Inertia"],["Newton’s 2nd","F=ma"],["Newton’s 3rd","Equal and opposite reaction"],["Work","W=F·d"],["Power","P=W/t"],["Kinetic energy","(1/2)mv^2"],["Potential energy","mgh"],["Momentum","p=mv"],["Impulse","Δp=FΔt"],["Conservation of energy","Total energy constant"],["Ohm’s law","V=IR"],["Wave speed","v=fλ"],["Index of refraction","n=c/v"],["Snell’s law","n1 sinθ1 = n2 sinθ2"],["Doppler effect","Frequency shift from relative motion"]
])
];
const out={topics:data};
fs.mkdirSync('app/data',{recursive:true});
fs.writeFileSync('app/data/flashcards.json',JSON.stringify(out,null,2));
console.log('topics',out.topics.length,'cards',out.topics.reduce((s,t)=>s+t.cards.length,0));
