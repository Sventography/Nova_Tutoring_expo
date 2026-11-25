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
  },
  {
    id:"music-studio",interest:"music",title:"The soundtrack without a picture",
    description:"Compose a musical cue for a scene and discover how tempo, harmony and arrangement change its meaning.",
    start:"brief",scenes:{
      brief:{title:"The commission",story:"A filmmaker asks you to score a scene of someone returning to a familiar room. The director wants both comfort and uncertainty. Which musical starting point would you try?",choices:[
        {label:"A slow, sparse major chord",feedback:"Major harmony can feel reassuring, but a slow tempo and sparse texture can leave room for uncertainty. Context matters more than a simple major-equals-happy rule.",next:"texture"},
        {label:"A gentle minor chord with a repeating rhythm",feedback:"Minor harmony and repetition can suggest reflection or unease, but they need not sound frightening. The performance and surrounding scene shape the effect.",next:"texture"}
      ]},
      texture:{title:"Change the arrangement",story:"The melody is working. You want to make the room feel a little unfamiliar without changing the notes. Try one production decision.",choices:[
        {label:"Reduce the instruments until only one remains",feedback:"A sparse arrangement can make small changes more noticeable. Removing instruments may create intimacy or expose uncertainty.",next:"tempo"},
        {label:"Keep the melody but add a distant echo",feedback:"An echo suggests space and distance. It can change how a listener interprets an otherwise identical melody.",next:"tempo"}
      ]},
      tempo:{title:"The final frame",story:"The person sits down, and the room is quiet. What would you do with the cue?",choices:[
        {label:"Let the rhythm slow and disappear",feedback:"Changing the pulse can suggest the scene is settling. Silence after music also directs attention to ordinary sounds.",next:"finish"},
        {label:"Keep a steady pulse through the final frame",feedback:"A continuing pulse can imply that something remains unresolved. Neither choice is automatically correct; each supports a different interpretation.",next:"finish"}
      ]},
      finish:{title:"Your cue is ready",story:"You explored harmony, texture, echo, rhythm and the role of silence. Try another arrangement, or make your own short recording using instruments or sounds available to you.",choices:[]}
    }
  },
  {
    id:"art-exhibition",interest:"art",title:"The painting that feels bigger than its canvas",
    description:"Design a tiny exhibition piece and experiment with perspective, contrast and composition.",
    start:"canvas",scenes:{
      canvas:{title:"A world on a flat surface",story:"Your imaginary painting shows a mountain trail. You want viewers to feel they could step inside. Choose a way to create depth.",choices:[
        {label:"Make nearby details larger and more defined",feedback:"Relative size and visible detail are depth cues. Nearby objects often appear larger and clearer, especially when you use a consistent perspective.",next:"color"},
        {label:"Use overlapping shapes to hide parts of distant objects",feedback:"Occlusion is a strong depth cue: we usually interpret a shape that blocks another as being closer. This works even without realistic shading.",next:"color"}
      ]},
      color:{title:"The distant mountains",story:"The foreground is vibrant. You want mountains in the background to feel far away. Try a color strategy.",choices:[
        {label:"Use softer contrast and less saturated colors",feedback:"Atmospheric scattering often makes distant landscapes appear hazier and lower in contrast. Painters can use that cue to suggest distance.",next:"focus"},
        {label:"Use equally sharp detail in every layer",feedback:"This can create an intentional flat or graphic style, but it weakens the atmospheric depth cue. It is a useful alternative if realism is not your goal.",next:"focus"}
      ]},
      focus:{title:"Guide the viewer",story:"The piece is nearly complete. Where should the viewer's eye go first? Choose a compositional technique.",choices:[
        {label:"Use a strong contrast near the trail entrance",feedback:"Local contrast often attracts attention. You can use it to establish a focal point before the eye travels into the painting.",next:"finish"},
        {label:"Use the trail's shape to lead toward the mountains",feedback:"Leading lines can guide attention through a composition. They can suggest movement and give viewers a route to follow.",next:"finish"}
      ]},
      finish:{title:"Your exhibition piece",story:"You explored relative size, overlapping shapes, atmospheric perspective and composition. Try sketching a variation using the other choices. Your artistic intention matters more than a single correct answer.",choices:[]}
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
