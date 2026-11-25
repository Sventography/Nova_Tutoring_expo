export const SCALE_FACTORS = [1,2,3,4] as const;
export function squareScale(factor: number, side = 2) {
  if (!Number.isFinite(side) || side <= 0 || !SCALE_FACTORS.some(n => n === factor)) throw new Error("Invalid scale");
  const length=side*factor;
  return {length, area:length*length, areaFactor:factor*factor, volumeFactor:factor*factor*factor};
}
export const DEPTH_LEVELS = [0,1,2,3] as const;
export function mountainPalette(level: number) {
  if (!DEPTH_LEVELS.some(n=>n===level)) throw new Error("Invalid depth level");
  // Illustrative artistic palette, not a physical atmospheric scattering model.
  const blend=(a:number,b:number,t:number)=>Math.round(a+(b-a)*t);
  const t=level/3;
  const mix=(rgb:readonly number[],haze:readonly number[],amount:number)=>"rgb("+rgb.map((x,i)=>blend(x,haze[i],amount)).join(",")+")";
  return {far:mix([45,89,95],[186,205,222],t*.85),middle:mix([39,106,91],[186,205,222],t*.4),near:mix([30,104,66],[186,205,222],t*.08)};
}

export const EDIT_CONTEXTS = [
  {id:"gift",label:"A wrapped gift",symbol:"gift",interpretation:"Anticipation or delight",explanation:"A gift after a neutral face can suggest that the person is expecting a surprise."},
  {id:"bench",label:"An empty bench",symbol:"bench",interpretation:"Loneliness or reflection",explanation:"An empty place after the same face can suggest absence, memory or someone who has not arrived."},
  {id:"door",label:"A partly open door",symbol:"door",interpretation:"Curiosity or uncertainty",explanation:"An unexplained doorway can make the expression seem attentive or uncertain."},
] as const;
export function editContext(id: string) {
  return EDIT_CONTEXTS.find(context=>context.id===id);
}

export const COIN_BATCHES = [10,50,100] as const;
export type CoinResults = { heads: number; tails: number };
export function simulateCoins(count: number, random: () => number = Math.random): CoinResults {
  if (!COIN_BATCHES.some(n=>n===count)) throw new Error("Invalid batch size");
  let heads=0;
  for(let i=0;i<count;i++){
    const sample=random();
    if(!Number.isFinite(sample)||sample<0||sample>=1) throw new Error("Invalid random sample");
    if(sample<0.5)heads++;
  }
  return {heads,tails:count-heads};
}
export const PIXEL_RESOLUTIONS = [8,16,32] as const;
export const PIXEL_SHAPES = ["circle","diamond","heart"] as const;
export const PIXEL_COLORS = [
  {label:"Blue",value:"#2468ad"},
  {label:"Purple",value:"#8054ad"},
  {label:"Green",value:"#237c57"},
] as const;
// Sample the same continuous shape at each pixel center, using normalized coordinates.
export function pixelMask(resolution: number, shape: string): boolean[] {
  if(!PIXEL_RESOLUTIONS.some(n=>n===resolution)||!PIXEL_SHAPES.some(s=>s===shape))throw new Error("Invalid pixel settings");
  return Array.from({length:resolution*resolution},(_,i)=>{
    const x=2*((i%resolution+0.5)/resolution)-1;
    const y=1-2*((Math.floor(i/resolution)+0.5)/resolution);
    if(shape==="diamond")return Math.abs(x)+Math.abs(y)<=0.86;
    if(shape==="heart"){
      const a=x*1.35,b=(y+0.12)*1.35;
      return Math.pow(a*a+b*b-1,3)-a*a*b*b*b<=0;
    }
    return x*x+y*y<=0.72*0.72;
  });
}

export const KEY_NOTES = ["C4","C♯4","D4","E♭4","E4","F4","F♯4","G4","A♭4","A4","B♭4","B4","C5"] as const;
export const CHORD_ROOTS = [0,2,5] as const;
export function noteFrequency(key: number) {
  if(!Number.isInteger(key)||key<0||key>=KEY_NOTES.length)throw new Error("Invalid key");
  return 440*Math.pow(2,(key-9)/12);
}
export function triad(root: number, minor: boolean) {
  if(!CHORD_ROOTS.some(n=>n===root)||typeof minor!=="boolean")throw new Error("Invalid chord");
  return [root,root+(minor?3:4),root+7];
}

export const STORY_SHOTS = [
  {id:"face",label:"A person looks up",symbol:"face"},
  {id:"letter",label:"An unopened letter on a table",symbol:"letter"},
  {id:"door",label:"A door slowly opens",symbol:"door"},
] as const;
const editReadings: Record<string,string> = {
  "0,1,2":"The glance introduces the letter, then the door raises a new question. We may expect an arrival or interruption.",
  "0,2,1":"The glance leads to the opening door. Ending on the letter may make it feel like the reason for the visit.",
  "1,0,2":"The letter establishes context before the person reacts. The opening door adds anticipation.",
  "1,2,0":"The letter and door become clues. Ending on the person invites us to read their expression as a reaction.",
  "2,0,1":"The opening door seems to prompt the glance. Ending on the letter redirects attention to a possible mystery.",
  "2,1,0":"The door and letter establish a situation before we see the person. Their expression becomes the final question.",
};
export function shotReading(order: readonly number[]) {
  if(order.length!==3||new Set(order).size!==3||!order.every(n=>Number.isInteger(n)&&n>=0&&n<3))throw new Error("Invalid shot order");
  return editReadings[order.join(",")];
}
export function moveShot(order: readonly number[], from: number, direction: number): number[] {
  shotReading(order);
  if(!Number.isInteger(from)||from<0||from>=order.length||![1,-1].includes(direction))throw new Error("Invalid move");
  const next=[...order],to=from+direction;
  if(to<0||to>=next.length)return next;
  [next[from],next[to]]=[next[to],next[from]];
  return next;
}

export const VIEWPOINTS = [
 {label:"Maya",passage:"Maya checked the time. Alex had promised to call before the train left. The screen stayed dark. Maybe Alex had forgotten.",feedback:"We know Maya's expectation and worry, but not why Alex hasn't called."},
 {label:"Alex",passage:"Alex searched the bag for the phone. It wasn't there. The train would leave any minute, and Maya was still waiting.",feedback:"We know the reason for the silence. Maya's worry becomes dramatic irony: readers know something Maya doesn't."},
 {label:"Observer",passage:"Maya watched a dark phone screen. Across town, Alex searched a bag as the station clock changed.",feedback:"We observe both characters, but cannot directly know their thoughts. The reader infers what matters."},
] as const;
export const SETUPS = [
 {label:"A spare key",payoffs:["The key opens a friend's locked garden shed.","The key belongs to a music box instead of a door."],feedback:["The object solves a later practical problem. Establish why the character has it.","The familiar object gains an unexpected meaning. Plant a clue about the unusual lock."]},
 {label:"A paper star",payoffs:["The star marks a page containing an important message.","A friend recognizes the star as a shared childhood symbol."],feedback:["A small visual detail becomes a useful marker. Let readers notice it early.","An ordinary object carries emotional history. Establish the relationship before the reveal."]},
 {label:"An open window",payoffs:["A breeze scatters papers, exposing a missing drawing.","The sound of a familiar song enters through the window."],feedback:["The setting detail causes a later event. Show why the window was open.","A sensory detail recalls an earlier moment. Connect the song to the character's experience."]},
] as const;
export function viewpoint(index: number) {
 if(!Number.isInteger(index)||index<0||index>=VIEWPOINTS.length)throw new Error("Invalid viewpoint");
 return VIEWPOINTS[index];
}
export function storyPayoff(setup: number, ending: number) {
 if(!Number.isInteger(setup)||setup<0||setup>=SETUPS.length||![0,1].includes(ending))throw new Error("Invalid story choice");
 return {setup:SETUPS[setup].label,ending:SETUPS[setup].payoffs[ending],feedback:SETUPS[setup].feedback[ending]};
}
