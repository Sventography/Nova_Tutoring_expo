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
        {label:"The wrapped gift",feedback:"The gift supplies context: an ordinary expression can now suggest anticipation or curiosity. This is an example of how editing shapes interpretation.",next:"sound-warm"},
        {label:"The empty playground",feedback:"The empty playground might imply loneliness or nostalgia instead. You can deliberately use that contrast to make the audience uncertain.",next:"reframe"}
      ]},
      reframe:{title:"Change the intention",story:"Your director likes the ambiguity, but wants a warmer meaning without reshooting the actor. You can add one shot.",choices:[
        {label:"Show someone arriving with the gift",feedback:"This creates a new context for the unchanged expression. The audience can infer a possible reunion.",next:"sound-warm"},
        {label:"Hold the empty playground longer",feedback:"The absence becomes more noticeable. This reinforces the ambiguity; it is a valid artistic choice even if it doesn't create warmth.",next:"sound-lonely"}
      ]},
      "sound-warm":{title:"A possible reunion",story:"Your earlier gift shot suggests an arrival. The audience expects the door to open. Decide whether the clock should accompany the reveal.",choices:[
        {label:"Let the ticking continue",feedback:"The familiar pulse carries the expectation into the reunion.",next:"finish-warm-steady"},
        {label:"Remove the ticking just before the door opens",feedback:"Silence makes the anticipated arrival feel unusually important or uncertain.",next:"finish-warm-quiet"}
      ]},
      "sound-lonely":{title:"An unresolved absence",story:"You kept the empty playground in the edit. Now an opening door could suggest hope or deepen the sense of absence. Decide how to use the ticking clock.",choices:[
        {label:"Let the ticking continue",feedback:"A steady pulse makes the waiting feel persistent.",next:"finish-lonely-steady"},
        {label:"Remove the ticking just before the door opens",feedback:"The silence interrupts the waiting, making the possible arrival more ambiguous.",next:"finish-lonely-quiet"}
      ]},
      "finish-warm-steady":{title:"A familiar rhythm",story:"The gift set up anticipation and the clock sustained it. Your edit suggests a reunion without requiring explanatory dialogue.",choices:[]},
      "finish-warm-quiet":{title:"A moment suspended",story:"The gift set up anticipation, but the sudden silence made the arrival feel less predictable. Your edit uses a change in sound to focus attention.",choices:[]},
      "finish-lonely-steady":{title:"Still waiting",story:"The empty playground and continuing clock leave a feeling of absence. Your edit lets the audience sit with an unresolved question.",choices:[]},
      "finish-lonely-quiet":{title:"A question in the silence",story:"The empty playground established absence; the missing ticking changes its meaning at the door. Your edit makes the audience reconsider what comes next.",choices:[]}
    }
  },
  {
    id:"moon-outpost",interest:"space",title:"The lunar outpost",
    description:"Use gravity, light and evidence to plan a fictional lunar science mission.",
    start:"landing",scenes:{
      landing:{title:"Arrival",story:"You're planning a jump demonstration for an outpost on the Moon. Everyone uses the same takeoff speed as on Earth. What do you expect?",choices:[
        {label:"A higher, longer jump",feedback:"Exactly. With lower gravity, the same initial velocity produces a greater peak height and longer flight time.",next:"signal"},
        {label:"A lower, shorter jump",feedback:"Try thinking about downward acceleration: weaker gravity slows the upward motion less quickly. The jump actually lasts longer and reaches higher.",next:"recheck-gravity"}
      ]},
      "recheck-gravity":{title:"Revise the demonstration",story:"Your first prediction needs a correction. A diagram shows the weaker downward acceleration on the Moon. How will you explain the revised plan?",choices:[
        {label:"Compare equal takeoff speeds and flight times",feedback:"That isolates the effect of gravity. The same starting speed leads to longer flight.",next:"signal"},
        {label:"Ask the team to compare both predicted trajectories",feedback:"Comparing a prediction with a corrected model helps reveal why they differ.",next:"signal"}
      ]},
      signal:{title:"The delayed reply",story:"You transmit a message to Earth, about 384,400 km away. Radio waves travel at roughly 300,000 km per second. How long until an instant reply returns?",choices:[
        {label:"About 2.6 seconds",feedback:"Right: around 1.28 seconds each way, or 2.56 seconds round trip, ignoring processing delays.",next:"sample"},
        {label:"About 1.3 seconds",feedback:"That's the approximate one-way time. The reply has to travel back too, so the round trip is about 2.6 seconds.",next:"recheck-signal"}
      ]},
      "recheck-signal":{title:"A second look at the signal",story:"The first estimate counted only the outbound trip. Before choosing a sample test, your team updates the fictional communication schedule to allow roughly 2.6 seconds for a round trip.",choices:[
        {label:"Record the corrected round-trip estimate",feedback:"Good. Clearly label one-way and round-trip times to avoid confusion.",next:"sample"}
      ]},
      sample:{title:"An unexpected observation",story:"Two samples from different sites look alike. One instrument suggests a difference. How should the mission team investigate?",choices:[
        {label:"Repeat the measurement and compare independent evidence",feedback:"Repeating measurements and checking independent evidence helps distinguish a real difference from instrument noise.",next:"independent-evidence"},
        {label:"Declare them different based on the first reading",feedback:"One reading is an interesting clue, but not a firm conclusion. Repeat the measurement before making a claim.",next:"review-claim"}
      ]},
      "independent-evidence":{title:"The second measurement",story:"A second instrument finds no clear difference. The team now has conflicting evidence. What belongs in the report?",choices:[
        {label:"Report uncertainty and propose a further test",feedback:"An honest report distinguishes an observation from a conclusion.",next:"finish-careful"},
        {label:"Explain the conflicting readings and hold off on a conclusion",feedback:"That records the evidence without overstating it.",next:"finish-careful"}
      ]},
      "review-claim":{title:"A colleague challenges the claim",story:"Your colleague asks for independent evidence before the difference is announced. You have an opportunity to revise the report.",choices:[
        {label:"Withdraw the firm claim and request another test",feedback:"Revising a conclusion when evidence is insufficient is a strength in science.",next:"finish-revised"},
        {label:"Keep the observation but label it preliminary",feedback:"A preliminary observation can guide more research without pretending the answer is settled.",next:"finish-revised"}
      ]},
      "finish-careful":{title:"Mission debrief: evidence first",story:"Your team documented uncertainty and avoided an unsupported conclusion. The fictional mission demonstrates how careful measurements and transparent reasoning work together.",choices:[]},
      "finish-revised":{title:"Mission debrief: a better claim",story:"Your initial claim needed revision. You responded to a challenge by distinguishing a preliminary result from a confirmed finding. Science improves through correction.",choices:[]}
    }
  },
  {
    id:"music-studio",interest:"music",title:"The soundtrack without a picture",
    description:"Compose a musical cue for a scene and discover how tempo, harmony and arrangement change its meaning.",
    start:"brief",scenes:{
      brief:{title:"The commission",story:"A filmmaker asks you to score a scene of someone returning to a familiar room. The director wants both comfort and uncertainty. Which musical starting point would you try?",choices:[
        {label:"A slow, sparse major chord",feedback:"Major harmony can feel reassuring, but a slow tempo and sparse texture can leave room for uncertainty. Context matters more than a simple major-equals-happy rule.",next:"texture-major"},
        {label:"A gentle minor chord with a repeating rhythm",feedback:"Minor harmony and repetition can suggest reflection or unease, but they need not sound frightening. The performance and surrounding scene shape the effect.",next:"texture-minor"}
      ]},
      "texture-major":{title:"Comfort with a question",story:"Your slow major harmony suggests familiarity. The director wants a hint of uncertainty without changing the notes.",choices:[
        {label:"Reduce the instruments until only one remains",feedback:"The familiar harmony becomes exposed and intimate.",next:"tempo-sparse"},
        {label:"Keep the melody but add a distant echo",feedback:"The familiar harmony seems to come from farther away.",next:"tempo-echo"}
      ]},
      "texture-minor":{title:"A reflective return",story:"Your gentle minor harmony and repeating rhythm suggest reflection. The director wants the room to feel familiar as well as uncertain.",choices:[
        {label:"Reduce the instruments until only one remains",feedback:"A quiet single instrument can make the reflective mood personal.",next:"tempo-sparse"},
        {label:"Keep the melody but add a distant echo",feedback:"The repetition and echo can suggest memories lingering.",next:"tempo-echo"}
      ]},
      "tempo-sparse":{title:"An intimate final frame",story:"Your single instrument now stands alone. Choose whether its rhythm fades or remains.",choices:[
        {label:"Let the rhythm slow and disappear",feedback:"The exposed sound gives way to silence, making the ending feel settled.",next:"finish-sparse-fade"},
        {label:"Keep a steady pulse through the final frame",feedback:"A single persistent pulse can leave an intimate question unresolved.",next:"finish-sparse-pulse"}
      ]},
      "tempo-echo":{title:"An echoing final frame",story:"Your distant echo has established a sense of space. Choose how the final rhythmic pulse behaves.",choices:[
        {label:"Let the rhythm slow and disappear",feedback:"The fading rhythm allows the echo to suggest distance and memory.",next:"finish-echo-fade"},
        {label:"Keep a steady pulse through the final frame",feedback:"The pulse and echo can create a sense that the memory continues.",next:"finish-echo-pulse"}
      ]},
      "finish-sparse-fade":{title:"Your cue: quiet resolution",story:"Your sparse arrangement and fading rhythm make room for ordinary sounds. Try playing the cue over a different scene to see how its meaning changes.",choices:[]},
      "finish-sparse-pulse":{title:"Your cue: an intimate question",story:"Your sparse arrangement leaves the persistent pulse exposed. The scene may feel close and personal while still unresolved.",choices:[]},
      "finish-echo-fade":{title:"Your cue: a distant memory",story:"Your echo and fading rhythm suggest a memory receding. You used texture and timing to change the scene without needing new notes.",choices:[]},
      "finish-echo-pulse":{title:"Your cue: a memory that remains",story:"Your echo and steady pulse suggest something continuing beyond the final frame. The effect depends on how the music meets the picture.",choices:[]}
    }
  },
  {
    id:"art-exhibition",interest:"art",title:"The painting that feels bigger than its canvas",
    description:"Design a tiny exhibition piece and experiment with perspective, contrast and composition.",
    start:"canvas",scenes:{
      canvas:{title:"A world on a flat surface",story:"Your imaginary painting shows a mountain trail. You want viewers to feel they could step inside. Choose a way to create depth.",choices:[
        {label:"Make nearby details larger and more defined",feedback:"Relative size and visible detail are depth cues. Nearby objects often appear larger and clearer, especially when you use a consistent perspective.",next:"color-size"},
        {label:"Use overlapping shapes to hide parts of distant objects",feedback:"Occlusion is a strong depth cue: we usually interpret a shape that blocks another as being closer. This works even without realistic shading.",next:"color-overlap"}
      ]},
      "color-size":{title:"A deep trail",story:"The nearby details are larger and more defined. Choose whether the mountains also use atmospheric haze or remain sharply outlined.",choices:[
        {label:"Use softer contrast and less saturated colors",feedback:"Haze reinforces the depth already suggested by relative size.",next:"focus-haze"},
        {label:"Use equally sharp detail in every layer",feedback:"Relative size still suggests distance, but the sharp edges create a more graphic look.",next:"focus-graphic"}
      ]},
      "color-overlap":{title:"Layers on the canvas",story:"Your overlapping shapes establish which layer is in front. Choose how color and contrast will support or contrast with that depth cue.",choices:[
        {label:"Use softer contrast and less saturated colors",feedback:"Haze makes the overlapping layers feel farther apart.",next:"focus-haze"},
        {label:"Use equally sharp detail in every layer",feedback:"The overlap still establishes order, while strong edges preserve a stylized composition.",next:"focus-graphic"}
      ]},
      "focus-haze":{title:"A walk into the distance",story:"Your softer background now suggests atmospheric distance. Decide where the viewer begins their journey.",choices:[
        {label:"Use a strong contrast near the trail entrance",feedback:"The contrast attracts attention to the foreground against the softer background.",next:"finish-haze-entrance"},
        {label:"Use the trail's shape to lead toward the mountains",feedback:"The trail directs attention through your hazy layers.",next:"finish-haze-trail"}
      ]},
      "focus-graphic":{title:"A graphic landscape",story:"Your sharp layers create a stylized landscape. Decide how to guide attention among the equally crisp shapes.",choices:[
        {label:"Use a strong contrast near the trail entrance",feedback:"Local contrast helps create a focal point even with strong detail elsewhere.",next:"finish-graphic-entrance"},
        {label:"Use the trail's shape to lead toward the mountains",feedback:"Leading lines create a route through the graphic shapes.",next:"finish-graphic-trail"}
      ]},
      "finish-haze-entrance":{title:"Your piece: a doorway to the landscape",story:"A strong foreground focal point invites the viewer into the softer distance. You combined contrast and atmospheric perspective.",choices:[]},
      "finish-haze-trail":{title:"Your piece: into the mist",story:"The trail leads through softer layers into the distance. Composition and atmospheric perspective work together to suggest space.",choices:[]},
      "finish-graphic-entrance":{title:"Your piece: a striking entrance",story:"Sharp forms preserve a graphic style, while local contrast establishes a focal point. Your stylistic choice changes how the landscape is read.",choices:[]},
      "finish-graphic-trail":{title:"Your piece: a path through shapes",story:"Crisp shapes and leading lines create a deliberate visual journey. You built depth through composition without relying on realistic atmospheric haze.",choices:[]}
    }
  }
];
export function orderedAdventures(interests: readonly Interest[]) {
  return [...ADVENTURES].sort((a,b) => Number(interests.includes(b.interest))-Number(interests.includes(a.interest)));
}
export function choosePath(adventure: Adventure, sceneId: string, index: number): Choice | undefined {
  if (!Object.prototype.hasOwnProperty.call(adventure.scenes, sceneId) || !Number.isInteger(index) || index < 0) return undefined;
  const choice = adventure.scenes[sceneId].choices[index];
  return choice && Object.prototype.hasOwnProperty.call(adventure.scenes, choice.next) ? choice : undefined;
}

export type AdventureStep = { sceneId: string; choiceIndex: number };
export type AdventureRun = { sceneId: string; steps: readonly AdventureStep[] };
export function startAdventure(adventure: Adventure): AdventureRun {
  return {sceneId:adventure.start,steps:[]};
}
export function advanceAdventure(adventure: Adventure, run: AdventureRun, choiceIndex: number): AdventureRun {
  const choice=choosePath(adventure,run.sceneId,choiceIndex);
  if(!choice)return run;
  return {sceneId:choice.next,steps:[...run.steps,{sceneId:run.sceneId,choiceIndex}]};
}
