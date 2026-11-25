import { discoveryForId } from "./discoveryModel";

type Reflection = { question: string; explanation: string };
const reflections: Record<string, Reflection> = {
  "film-cut": {question:"Can you change the meaning of a neutral facial expression without changing the acting?",explanation:"Yes. The neighboring shots can change what the audience thinks the character is reacting to."},
  "film-sound": {question:"Why might removing an ordinary background sound create suspense?",explanation:"The change breaks a familiar prediction. Attention shifts toward the absence and what it might mean."},
  "art-color": {question:"If the gray squares have identical color values, what creates their apparent difference?",explanation:"Their surroundings influence visual perception; the center colors themselves stay identical."},
  "art-depth": {question:"How could you make a distant mountain appear farther away without changing its size?",explanation:"Reduce contrast and saturation to suggest the atmospheric scattering associated with distant scenery."},
  "music-octave": {question:"If a note has a frequency of 330 Hz, what frequency is one octave higher?",explanation:"660 Hz. An octave above has twice the original frequency."},
  "music-mood": {question:"Does changing a chord from major to minor guarantee that listeners will feel sad?",explanation:"No. Harmony matters, but so do rhythm, culture, arrangement, personal associations and context."},
  "space-gravity": {question:"With the same takeoff velocity, what happens to jump height when gravity is reduced?",explanation:"The jump reaches higher and lasts longer in the simplified model."},
  "space-light": {question:"If light takes 100 years to reach us from a star, which version of that star do we see?",explanation:"We see light emitted about 100 years ago, not an instantaneous view of the star today."},
  "astro-history": {question:"What distinguishes a constellation story from a scientific prediction?",explanation:"A story carries cultural or symbolic meaning; a scientific prediction must be testable against evidence."},
  "astro-calendar": {question:"Which repeating observations might help people design a calendar?",explanation:"Lunar phases and the recurring seasonal patterns of the Sun are two useful observations."},
  "science-shadow": {question:"What can happen to a shadow when an object moves closer to a small light source?",explanation:"The projected shadow generally becomes larger if the projection surface stays fixed."},
  "science-ice": {question:"Why is ordinary ice able to float on liquid water?",explanation:"Its open crystal structure makes it less dense than liquid water."},
  "math-scale": {question:"If a square's side length triples, how many times larger does its area become?",explanation:"Nine times larger, because the length multiplier is squared."},
  "math-chance": {question:"After five heads from independent fair flips, is tails more likely on the next flip?",explanation:"No. The next fair flip still has equal probabilities for heads and tails."},
  "history-sources": {question:"What could you look for when two eyewitness accounts disagree?",explanation:"Independent records, context, possible bias and corroborating evidence can help evaluate their claims."},
  "history-map": {question:"Why might a trade map look different from a political map of the same place?",explanation:"Each map selects details for a different purpose: movement of goods versus political boundaries, for example."},
  "tech-search": {question:"Why is starting in the middle useful when guessing a hidden number with higher/lower hints?",explanation:"It can remove roughly half the remaining possibilities at each step."},
  "tech-pixels": {question:"Does a higher pixel count always guarantee a better photograph?",explanation:"No. Resolution is only one factor; capture quality, lighting and compression also matter."},
  "writing-pov": {question:"How can two honest narrators interpret the same conversation differently?",explanation:"They can have different knowledge, memories, expectations and emotional responses."},
  "writing-payoff": {question:"How can an ordinary early detail prevent a later plot development from feeling arbitrary?",explanation:"It establishes a setup that gives the later payoff a meaningful connection to earlier events."},
};
export function reflectionFor(id: string): Reflection | undefined {
  if (!discoveryForId(id)) return undefined;
  return Object.prototype.hasOwnProperty.call(reflections,id) ? reflections[id] : undefined;
}
export function discoveryNote(id: string): string | undefined {
  const d = discoveryForId(id);
  if (!d) return undefined;
  return [d.title, "", "What I discovered", d.insight, "", "Try it yourself", d.activity, "", "My own thoughts:", "", "Questions I want to explore next:", ""].join("\n");
}
