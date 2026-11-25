import { discoveryForId } from "./discoveryModel";
import { reflectionFor } from "./discoveryReflection";

export type PracticeCard = { question: string; options: readonly string[]; answer: number; explanation: string };
type Application = { question: string; options: readonly [string,string,string]; answer: 0|1|2; explanation: string };
const applications: Record<string, Application> = {
 "film-cut": {question:"You want the same neutral close-up to suggest relief instead of suspicion. Which edit could help?",options:["Change the neighboring shot to a friend arriving safely","Increase the file resolution only","Keep all shots identical and change the filename"],answer:0,explanation:"The arriving friend supplies new context for the same expression. Editing influences the interpretation."},
 "film-sound": {question:"A hallway has a constant mechanical hum. How might you create tension without increasing volume?",options:["Add a louder alarm","Remove the familiar hum just before a door opens","Change the video's file format"],answer:1,explanation:"The unexpected absence breaks the established sound pattern and can redirect attention."},
 "art-color": {question:"Two painted squares use identical gray paint but look different. What should you compare first?",options:["The names of the paints","The canvas dimensions","The surrounding colors"],answer:2,explanation:"Simultaneous contrast changes how a color is perceived depending on its surroundings."},
 "art-depth": {question:"Which change can make a faraway mountain seem more distant?",options:["Softer contrast and less saturated colors","Sharpening every distant detail","Making every layer equally vivid"],answer:0,explanation:"Atmospheric perspective uses lower contrast and saturation to suggest distance."},
 "music-octave": {question:"A note vibrates at 220 Hz. Which frequency is an octave above it?",options:["330 Hz","440 Hz","660 Hz"],answer:1,explanation:"An octave above doubles frequency: 220 × 2 = 440 Hz."},
 "music-mood": {question:"You want a major chord to feel uncertain in a film. What could you experiment with?",options:["Assume major chords always sound happy","Change the spelling of the chord name","Use sparse instrumentation, an uneasy rhythm or unusual context"],answer:2,explanation:"Harmony contributes to emotion but tempo, texture and context matter too."},
 "space-gravity": {question:"In the simplified jump model, you launch at the same speed on two worlds. Which gives you a higher jump?",options:["The world with weaker gravity","The world with stronger gravity","Both always give the same height"],answer:0,explanation:"Peak height is inversely proportional to gravitational acceleration when takeoff speed is fixed."},
 "space-light": {question:"A star is 50 light-years away. Roughly how long ago was the light reaching us tonight emitted?",options:["50 days ago","50 years ago","At this exact moment"],answer:1,explanation:"A light-year is the distance light travels in one year."},
 "astro-history": {question:"Two cultures tell different stories about the same stars. What is a good way to study them?",options:["Treat both as proven personality predictions","Assume only one culture can tell a story","Compare their cultural meanings separately from astronomical evidence"],answer:2,explanation:"Constellation traditions are meaningful cultural history, but symbolic interpretations are not established scientific predictions."},
 "astro-calendar": {question:"You want to make a calendar from repeated observations of the sky. Which would be useful?",options:["Record recurring lunar phases","Choose dates at random","Ignore all repeated patterns"],answer:0,explanation:"Lunar phases recur in a recognizable cycle and have been used to organize calendars."},
 "science-shadow": {question:"A small lamp and a wall stay fixed. What usually happens if an object moves toward the lamp?",options:["The shadow always disappears","Its projected shadow becomes larger","Its shadow always becomes smaller"],answer:1,explanation:"The object blocks a wider angle of light at a shorter distance from the source."},
 "science-ice": {question:"A piece of ordinary ice floats in water. What does that tell you?",options:["It is necessarily warmer than the water","It has no mass","It is less dense than the liquid water"],answer:2,explanation:"Floating ice displaces enough water to balance its weight because its density is lower."},
 "math-scale": {question:"A square painting's sides double in length. How much canvas area is needed?",options:["Four times as much","Twice as much","Eight times as much"],answer:0,explanation:"Area scales with the square of the length multiplier: 2 × 2 = 4."},
 "math-chance": {question:"A fair coin has landed heads four times independently. What is the chance of tails on the next flip?",options:["Almost certain","One half","Zero"],answer:1,explanation:"Independent fair flips do not remember earlier outcomes."},
 "history-sources": {question:"Two accounts of an old festival disagree. What would strengthen your conclusion?",options:["Choose the longer account automatically","Ignore the disagreement","Compare independent records and their context"],answer:2,explanation:"Corroboration and source evaluation help distinguish evidence from unsupported assumptions."},
 "history-map": {question:"Why would you use a trade-route map instead of a boundary map to study an old market?",options:["It emphasizes movement of goods and connections","It must show every historical fact","It proves boundaries never matter"],answer:0,explanation:"Maps emphasize features suited to their purpose; trade routes can explain market connections."},
 "tech-search": {question:"A hidden number is between 1 and 100. Which first guess best splits the search space?",options:["1","50","100"],answer:1,explanation:"A central guess lets a higher/lower hint discard roughly half the candidates."},
 "tech-pixels": {question:"A high-resolution photograph looks poor. What is a plausible reason?",options:["High resolution guarantees perfection","A picture cannot contain color","Lighting, capture quality or compression are also important"],answer:2,explanation:"Resolution is only one property of a digital image, not a guarantee of quality."},
 "writing-pov": {question:"Two characters witness a reunion but one is jealous and one is relieved. What can a limited viewpoint change?",options:["Which details and emotional interpretations the reader receives","The number of letters in the alphabet","Whether the story is written in a file"],answer:0,explanation:"A character's knowledge and feelings influence what is noticed and how events are interpreted."},
 "writing-payoff": {question:"You plan a surprise ending that depends on a missing key. How can you make it feel earned?",options:["Explain a completely unrelated event","Establish the key's importance or absence earlier","Introduce the key for the first time after the ending"],answer:1,explanation:"Setup gives later developments a meaningful connection to what the reader already encountered."}
};
export function practiceFor(id: string): PracticeCard | undefined {
 if (!discoveryForId(id) || !Object.prototype.hasOwnProperty.call(applications,id)) return undefined;
 return applications[id];
}
export function recallFor(id: string): {front:string;back:string} | undefined {
 const reflection=reflectionFor(id);
 return reflection ? {front:reflection.question,back:reflection.explanation} : undefined;
}
export function evaluatePractice(id: string, choice: number): {correct:boolean;explanation:string}|undefined {
 const card=practiceFor(id);
 if (!card || !Number.isInteger(choice) || choice<0 || choice>=card.options.length) return undefined;
 return {correct:choice===card.answer,explanation:card.explanation};
}
