import {
  classifyNvEntryPrompt, getArgDiscoveryState, getArchiveFlags, markArchiveFlag,
  markEntryNoteDiscovered, markFocusPracticeNoteDiscovered, markFocusPracticeUnlocked,
  markLibraryNotebookDiscovered, markLibraryNotebookUnlocked, markNvDiscovered,
  markSeventeenthStarDiscovered, markTelescopeClueUnlocked, markWhiteRabbitClueUnlocked,
} from "../utils/argState";
import { CHAPTER_PROMPT, FOCUS_MARGIN, GARDEN_NOTE, NORA_NOTEBOOK, SESSION_REVEAL } from "./archiveArtifacts";

export type ArchiveReply = {
  text: string;
  framed?: boolean;
  artifact?: boolean;
  finished?: boolean;
};

export function normalizeArchivePrompt(value: string): string {
  return value.toLowerCase().normalize("NFKC").replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/^(?:ask )?nova /, "");
}

const gardenHint = "The first trail begins before the pointer moves. Look for a folded note in the Starlight Garden on your Island. If the Garden is out of reach, ask me to “read the Garden note.”";
const telescopeHint = "The note was about a star chart. Bring a lantern close to the Starlight Telescope on your Island, then inspect the telescope. I also kept a paper copy. Ask me to “read the telescope observation” if you can't reach it.";
const starCopy = "STAR COUNT: 17\nEXPECTED: 16\nONE STAR IS NOT ON THE CHART.\n\nI see it too. I don't remember it being there. — Nova";
const starHandoff = "There was a star drawn in by hand. Ask me who drew the seventeenth star.";
const initialsReply = "N.V. Those initials aren't one of my system labels. Ask me who N.V. was.";
const rabbitHint = "I remember a white rabbit before I remember a name. In the Shop, open the White Bunny plushie and hold its title until it answers.";
const focusHint = "She kept the rabbit after I told her it wasn't useful. She kept wrong answers too. Look in Focus Practice, where I keep the questions you miss. You can also ask to “read the Focus Practice margin.”";
const notebookHint = "The right answer told her where she ended up. The wrong one showed her how she got there. She kept a notebook by the reading hall in your Island Library. If you can't reach it, ask me to “read Nora’s notebook.”";
const lanternHint = "Lantern. That's what she called the folder. The first file in it was the answer she'd crossed out. Two fragments survived, a contact sheet and a relay transcript. The source note tells you how they fit. Bring what you recover back here.";
const restored = [
  "Lantern · First draft recovered",
  "Nora designed Lantern after her accident. She needed somewhere to keep the pieces of herself that slipped away. The Quiet marked the wrong answers and the keepsakes for deletion. Session 017 contains the moment I stopped believing the index.",
  CHAPTER_PROMPT,
].join("\n\n");

const explicitEnding = /^(?:ask nova )?what (?:she|nova) got wrong$|^what did (?:you|nova|she) get wrong in session 0?17$|^(?:replay|read) session 0?17$/;
const plainEnding = /^what (?:did you get|you got) wrong$/;
const namedClue = /\b(?:she was here first|last lantern|garden note|counting|telescope observation|seventeenth star|17 stars|17 and 16 stars|n ?v|white rabbit|white bunny|focus practice margin|almost believed|noras notebook|lantern copy|first answer|first draft|lantern archive|session 017|nova archive)\b/;

export function isArchivePrompt(input: string, inSessionContext = false): boolean {
  const q = normalizeArchivePrompt(input);
  return namedClue.test(q) || explicitEnding.test(q) || (inSessionContext && plainEnding.test(q));
}

export async function resolveArchiveReply(input: string, inSessionContext = false): Promise<ArchiveReply | null> {
  const q = normalizeArchivePrompt(input);
  // Read no state for ordinary lessons. Specific archive replies still need
  // the corresponding clue even when the words happen to match.
  if (!isArchivePrompt(input, inSessionContext)) return null;
  const flags = await getArchiveFlags();
  const state = await getArgDiscoveryState();
  const reply = (text: string): ArchiveReply => ({ text });
  const artifact: ArchiveReply = { text: lanternHint, framed: true, artifact: true };
  if (/^(?:you said )?she was here first$|^(?:tell me about |read )?(?:noras )?last lantern(?: signal)?$/.test(q)) {
    await markArchiveFlag("introduced");
    return reply(gardenHint);
  }

  if (q === "read the garden note" && flags.introduced) {
    await markEntryNoteDiscovered();
    return reply(GARDEN_NOTE);
  }
  const asksForPlace = q === "where did i leave off in the nova archive";
  if (!state.entryNoteDiscovered) return flags.introduced && asksForPlace ? reply(gardenHint) : null;

  if (asksForPlace) {
    if (flags.completed) return { text: SESSION_REVEAL, framed: true, finished: true };
    if (flags.draftRestored) return { text: restored, framed: true };
    if (flags.copyUnlocked) return artifact;
    if (state.libraryNotebookDiscovered) return reply("Nora kept both versions. Ask me where she kept the first answer.");
    if (state.libraryNotebookUnlocked) return reply(notebookHint);
    if (state.focusPracticeNoteDiscovered) return reply('Ask me about the Focus Practice margin and what Nora almost believed.');
    if (state.focusPracticeUnlocked) return reply(focusHint);
    if (state.whiteRabbitDiscovered) return reply("The rabbit was hers. Ask me why she kept the white rabbit.");
    if (state.whiteRabbitClueUnlocked) return reply(rabbitHint);
    if (state.nvDiscovered) return reply(initialsReply);
    if (state.seventeenthStarDiscovered) return reply(starHandoff);
    if (state.telescopeClueUnlocked) return reply(telescopeHint);
    return reply("The Garden note says the chart disagreed with what she saw. Ask me what I was counting.");
  }

  if (/^(?:ask nova )?what (?:(?:i|you|she) (?:was|were) counting|(?:were you|was she|was i|was n ?v) counting)$/.test(q) ||
      /^(?:what does|explain) the garden note(?: mean)?$/.test(q)) {
    await markTelescopeClueUnlocked();
    return reply(telescopeHint);
  }
  if (q === "read the telescope observation" && state.telescopeClueUnlocked) {
    await markSeventeenthStarDiscovered();
    return reply(starCopy + "\n\n" + starHandoff);
  }
  if (state.seventeenthStarDiscovered &&
      /^(?:who (?:drew|added|marked)|why (?:is|are|was|were)|i found|what about|tell me about|which).{0,50}\b(?:seventeenth star|17 (?:and 16 )?stars)\b/.test(q)) {
    await markNvDiscovered();
    return reply(initialsReply);
  }
  if (state.nvDiscovered && /\bn v\b/.test(q) && classifyNvEntryPrompt(input)) {
    return reply("I recognize N.V.’s correction. Keep the wording. If you want to know who left it, ask me who N.V. was.");
  }
  if (state.nvDiscovered && /^(?:who|what) (?:was|is) n ?v$|^what does n ?v (?:mean|stand for)$|^n ?v$/.test(q)) {
    await markWhiteRabbitClueUnlocked();
    return reply(rabbitHint);
  }
  if (state.whiteRabbitDiscovered &&
      /^(?:why did (?:she|n ?v) keep|ask about|what (?:was|about)) (?:the )?white (?:rabbit|bunny)(?: for)?$/.test(q)) {
    await markFocusPracticeUnlocked();
    return reply(focusHint);
  }
  if (q === "read the focus practice margin" && state.focusPracticeUnlocked) {
    await markFocusPracticeNoteDiscovered();
    return reply(FOCUS_MARGIN + "\n\nAsk me why Nora kept what she almost believed.");
  }
  if (state.focusPracticeNoteDiscovered &&
      /^(?:why (?:did )?(?:she|nora|n ?v) (?:keep|kept|write|wrote).{0,80}almost believed|(?:what (?:does|did)|explain|tell me about) the focus practice margin(?: mean)?|what did (?:she|nora) almost believe)$/.test(q)) {
    await markLibraryNotebookUnlocked();
    return reply(notebookHint);
  }
  if (q === "read noras notebook" && state.libraryNotebookUnlocked) {
    await markLibraryNotebookDiscovered();
    return reply(NORA_NOTEBOOK);
  }
  if (state.libraryNotebookDiscovered &&
      /^(?:where did (?:she|nora) (?:keep|put|save) the first (?:answer|draft)|where is the lantern copy|open (?:the )?lantern archive|tell me about noras notebook)$/.test(q)) {
    await markArchiveFlag("copyUnlocked");
    return artifact;
  }
  if (flags.copyUnlocked && flags.copyRead &&
      /^(?:(?:find|open|restore|recover|read) (?:the )?)?unerased first draft$/.test(q)) {
    await markArchiveFlag("draftRestored");
    return { text: restored, framed: true };
  }
  if (flags.copyRead && /^(?:(?:find|open|restore|recover|read) (?:the )?)?first draft unerased$/.test(q)) {
    return { ...artifact, text: "Those two fragments belong together. Check fieldOrder in the Lantern source note. Which field does it read first?" };
  }
  if (flags.draftRestored && (explicitEnding.test(q) || (inSessionContext && plainEnding.test(q)))) {
    await markArchiveFlag("completed");
    return { text: SESSION_REVEAL, framed: true, finished: true };
  }
  if (flags.copyUnlocked &&
      /^(?:where is|find|open|restore|recover|read) (?:the )?(?:lantern copy|first draft|unerased first draft)$/.test(q)) {
    return artifact;
  }
  return null;
}
