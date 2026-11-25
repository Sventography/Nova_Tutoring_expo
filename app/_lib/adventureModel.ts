import type { Interest } from "./discoveryModel";

export type Choice = { label: string; feedback: string; next: string };
export type Scene = { title: string; story: string; choices: readonly Choice[] };
export type Adventure = { id: string; interest: Interest; title: string; description: string; start: string; scenes: Record<string, Scene> };
export const ADVENTURES: readonly Adventure[] = [
  {
    id: "silent-film", interest: "film", title: "The scene that changes everything",
    description: "You're the editor. Turn the same footage into two completely different stories.",
    start: "edit", scenes: {
      edit: {title:"An unfinished film",story:"You have three clips: a person looking out of a window, an empty playground, and a wrapped gift. Your director wants a scene about anticipation. Which shot follows the person's face?",choices:[
        {label:"The wrapped gift",feedback:"The gift supplies context: an ordinary expression can now suggest anticipation or curiosity. This is an example of how editing shapes interpretation.",next:"sound"},
        {label:"The empty playground",feedback:"The empty playground might imply loneliness or nostalgia instead. You can deliberately use that contrast to make the audience uncertain.",next:"reframe"}
      ]},
      reframe:{title:"Change the intention",story:"Your director likes the ambiguity, but wants a warmer meaning without reshooting the actor. You can add one shot.",choices:[
        {label:"Show someone arriving with the gift",feedback:"This creates a new context for the unchanged expression. The audience can infer a possible reunion.",next:"sound"},
        {label:"Hold the empty playground longer",feedback:"The absence becomes more noticeable. This reinforces the ambiguity; it is a valid artistic choice even if it doesn't create warmth.",next:"sound"}
      ]},
      sound:{title:"The sound mix",story:"The scene has a steady ticking clock. A hand reaches for the door. Try a sound choice.",choices:[
        {label:"Let the ticking continue",feedback:"A steady pulse keeps the space familiar, but can also suggest impatience or anticipation.",next:"finish"},
        {label:"Remove the ticking just before the door opens",feedback:"Removing a familiar sound creates a perceptual change. The absence can draw attention and produce tension without a loud effect.",next:"finish"}
      ]},
      finish:{title:"Your edit is complete",story:"You changed the meaning of a performance without reshooting it. Editing and sound shape what the audience infers. Try another route to create a different emotional effect.",choices:[]}
    }
  },
  {
    id:"moon-outpost",interest:"space",title:"The lunar outpost",
    description:"Use gravity, light and evidence to plan a fictional lunar science mission.",
    start:"landing",scenes:{
      landing:{title:"Arrival",story:"You're planning a jump demonstration for an outpost on the Moon. Everyone uses the same takeoff speed as on Earth. What do you expect?",choices:[
        {label:"A higher, longer jump",feedback:"Exactly. With lower gravity, the same initial velocity produces a greater peak height and longer flight time.",next:"signal"},
        {label:"A lower, shorter jump",feedback:"Try thinking about downward acceleration: weaker gravity slows the upward motion less quickly. The jump actually lasts longer and reaches higher.",next:"signal"}
      ]},
      signal:{title:"The delayed reply",story:"You transmit a message to Earth, about 384,400 km away. Radio waves travel at roughly 300,000 km per second. How long until an instant reply returns?",choices:[
        {label:"About 2.6 seconds",feedback:"Right: around 1.28 seconds each way, or 2.56 seconds round trip, ignoring processing delays.",next:"sample"},
        {label:"About 1.3 seconds",feedback:"That's the approximate one-way time. The reply has to travel back too, so the round trip is about 2.6 seconds.",next:"sample"}
      ]},
      sample:{title:"An unexpected observation",story:"Two samples from different sites look alike. One instrument suggests a difference. How should the mission team investigate?",choices:[
        {label:"Repeat the measurement and compare independent evidence",feedback:"Repeating measurements and checking independent evidence helps distinguish a real difference from instrument noise.",next:"finish"},
        {label:"Declare them different based on the first reading",feedback:"One reading is an interesting clue, but not a firm conclusion. Repeat the measurement before making a claim.",next:"finish"}
      ]},
      finish:{title:"Mission debrief",story:"You used physics to predict motion, estimated signal travel time and evaluated evidence. These are real scientific skills, applied to an imagined mission.",choices:[]}
    }
  }
];
export function orderedAdventures(interests: readonly Interest[]) {
  return [...ADVENTURES].sort((a,b) => Number(interests.includes(b.interest))-Number(interests.includes(a.interest)));
}
export function choosePath(adventure: Adventure, sceneId: string, index: number): Choice | undefined {
  const choice = adventure.scenes[sceneId]?.choices[index];
  return choice && Object.prototype.hasOwnProperty.call(adventure.scenes, choice.next) ? choice : undefined;
}
