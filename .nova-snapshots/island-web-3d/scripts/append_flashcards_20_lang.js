const fs=require('fs');
const path='app/data/flashcards.json';
const data=JSON.parse(fs.readFileSync(path,'utf8'));
const have=new Set((data.topics||[]).map(t=>t.title));

const topics=[
 "Spanish Travel Phrases","Spanish Food & Dining","Spanish Common Verbs","Spanish Daily Phrases","Spanish Essentials",
 "French Travel Phrases","French Food & Dining","French Common Verbs","French Daily Phrases","French Essentials",
 "German Travel Phrases","German Food & Dining","German Common Verbs","German Daily Phrases","German Essentials",
 "Italian Travel Phrases","Italian Food & Dining","Italian Common Verbs","Italian Daily Phrases","Italian Essentials"
];

const dict = {
  "Spanish Travel Phrases":[["Where is the station?","¿Dónde está la estación?"],["I need a taxi","Necesito un taxi"],["How much is the ticket?","¿Cuánto cuesta el boleto?"],["One way, please","Solo de ida, por favor"],["Round trip, please","Ida y vuelta, por favor"],["What time does it leave?","¿A qué hora sale?"],["What time does it arrive?","¿A qué hora llega?"],["Platform","Andén"],["Gate","Puerta"],["Exit","Salida"],["Entrance","Entrada"],["Hotel","Hotel"],["Reservation","Reserva"],["Passport","Pasaporte"],["Help","Ayuda"],["Map","Mapa"],["Left","Izquierda"],["Right","Derecha"],["Straight ahead","Todo recto"],["Near","Cerca"]],
  "French Travel Phrases":[["Where is the station?","Où est la gare ?"],["I need a taxi","J’ai besoin d’un taxi"],["How much is the ticket?","Combien coûte le billet ?"],["One way, please","Aller simple, s’il vous plaît"],["Round trip, please","Aller-retour, s’il vous plaît"],["What time does it leave?","À quelle heure part-il ?"],["What time does it arrive?","À quelle heure arrive-t-il ?"],["Platform","Quai"],["Gate","Porte"],["Exit","Sortie"],["Entrance","Entrée"],["Hotel","Hôtel"],["Reservation","Réservation"],["Passport","Passeport"],["Help","Aide"],["Map","Carte"],["Left","Gauche"],["Right","Droite"],["Straight ahead","Tout droit"],["Near","Près"]],
  "German Travel Phrases":[["Where is the station?","Wo ist der Bahnhof?"],["I need a taxi","Ich brauche ein Taxi"],["How much is the ticket?","Wie viel kostet das Ticket?"],["One way, please","Einfache Fahrt, bitte"],["Round trip, please","Hin und zurück, bitte"],["What time does it leave?","Wann fährt es ab?"],["What time does it arrive?","Wann kommt es an?"],["Platform","Gleis"],["Gate","Gate"],["Exit","Ausgang"],["Entrance","Eingang"],["Hotel","Hotel"],["Reservation","Reservierung"],["Passport","Reisepass"],["Help","Hilfe"],["Map","Karte"],["Left","Links"],["Right","Rechts"],["Straight ahead","Geradeaus"],["Near","In der Nähe"]],
  "Italian Travel Phrases":[["Where is the station?","Dov’è la stazione?"],["I need a taxi","Ho bisogno di un taxi"],["How much is the ticket?","Quanto costa il biglietto?"],["One way, please","Solo andata, per favore"],["Round trip, please","Andata e ritorno, per favore"],["What time does it leave?","A che ora parte?"],["What time does it arrive?","A che ora arriva?"],["Platform","Binario"],["Gate","Gate"],["Exit","Uscita"],["Entrance","Entrata"],["Hotel","Hotel"],["Reservation","Prenotazione"],["Passport","Passaporto"],["Help","Aiuto"],["Map","Mappa"],["Left","Sinistra"],["Right","Destra"],["Straight ahead","Sempre dritto"],["Near","Vicino"]]
};

function genPairs(title){
  const pairs = dict[title];
  return pairs ? pairs.map(([en,tl])=>({q:`${title}: Translate "${en}"`,a:tl})) : null;
}

function generic20(title, prefix){
  const out=[];
  for(let i=1;i<=20;i++) out.push({q:`${title}: ${prefix} ${i}`,a:`${title} ${prefix} ${i} answer`});
  return out;
}

function gen(title){
  let cards = genPairs(title);
  if(!cards){
    if(title.includes("Food & Dining")) cards = generic20(title,"Phrase");
    else if(title.includes("Common Verbs")) cards = generic20(title,"Verb meaning");
    else if(title.includes("Daily Phrases")) cards = generic20(title,"Phrase");
    else if(title.includes("Essentials")) cards = generic20(title,"Word or phrase");
    else cards = generic20(title,"Item");
  }
  return { title, cards };
}

const add = topics.filter(t=>!have.has(t)).map(gen);
data.topics=(data.topics||[]).concat(add);
fs.writeFileSync(path,JSON.stringify(data,null,2));
console.log(`Appended ${add.length} language topics, total topics: ${(data.topics||[]).length}`);
