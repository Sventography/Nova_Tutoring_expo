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
