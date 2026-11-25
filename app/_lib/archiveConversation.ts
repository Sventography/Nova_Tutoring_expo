import {
  ARG_ACT1_FINALE_REPLY, classifyNvEntryPrompt, getArchiveFlags, getArgDiscoveryState,
  markArchiveFlag, markArgAct1Complete, markEntryNoteDiscovered, markFocusPracticeNoteDiscovered,
  markFocusPracticeUnlocked, markLanternCopyDiscovered, markLanternFolderDiscovered,
  markLibraryNotebookDiscovered, markLibraryNotebookUnlocked, markNvDiscovered,
  markSeventeenthStarDiscovered, markTelescopeClueUnlocked, markWhiteRabbitClueUnlocked,
  type ArgDiscoveryState, type ArchiveFlags, type ArgOwner,
} from "../utils/argState";
import { CHAPTER_PROMPT, FOCUS_MARGIN, GARDEN_NOTE, NORA_NOTEBOOK, SESSION_REVEAL, TELESCOPE } from "./archiveArtifacts";

export type ArchiveReply = {
  text: string;
  framed?: boolean;
  artifact?: boolean;
  finished?: boolean;
};

export function normalizeArchivePrompt(value: string): string {
  return value.toLowerCase().normalize("NFKC").replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/^(?:hey |ask )?nova /, "")
    .replace(/^(?:can|could|would) you (?:please )?/, "")
    .replace(/\bn v\b/g, "nv").replace(/^whos /, "who is ").replace(/^whats /, "what is ");
}

const gardenHint = "She was here first. I remember someone writing that, but when I picture the handwriting, it feels like mine. There’s a folded note in the Starlight Garden on your Island. I kept a copy here too. You can ask to read the Garden note.";
const telescopeHint = "She was counting stars, but she left two versions of the same night. Bring a lantern close to the Starlight Telescope on your Island and look at the two charts in its light. If the telescope is out of reach, ask me to read the telescope observation.";
const starHandoff = "Only the copy contains the extra mark. The initials are on that copy. I remember making it, but the signature isn't mine. Whose hand do you think I remember?";
const initialsReply = "N.V. The initials sit right under the pencil mark. I know how the pencil felt in my hand. One signed drawing could be a coincidence. I remember something that had nothing to do with the stars, too.";
const rabbitHint = "N.V. kept a white rabbit on the desk. This is a different memory, not another chart. I remember mending its ear and turning the knot inward so it wouldn't scratch my cheek. In the Shop, open Bunny Plushie (White) and read its old inventory label. See who signed it.";
const focusHint = "“I repaired the ear myself.” She signed that with the same initials as the chart. And I just told you I felt the knot. If it really was her rabbit, why do I remember repairing it? She used to ask me to keep the things I couldn't grade, even mistakes. Look at the margin where the missed questions go, in Focus Practice. I can also read the Focus Practice margin here.";
const notebookHint = "A correct answer could tell her what she knew today. She wanted to see what she thought yesterday, too. She kept both attempts in a notebook by the reading hall in your Island Library. I wonder whether the first attempt was about those very charts. You can also ask me to read Nora’s notebook.";
const lanternHint = "The original was filed under Lantern, the light from the telescope table. The index only kept the corrected page. Two scraps escaped it: a contact sheet and a relay transcript. The contact sheet tells us which chart survived; the relay tells us which version of the answer was kept. Lantern Field Notes gives the recovery order. Together they identify one missing record, not two separate secrets.";
const fieldNotes: ArchiveReply = { text: lanternHint, framed: true, artifact: true };
const restored: ArchiveReply = { text: ARG_ACT1_FINALE_REPLY + "\n\n" + CHAPTER_PROMPT, framed: true };

export async function openLanternFieldNotes(owner: ArgOwner = null): Promise<ArchiveReply> {
  await markLanternCopyDiscovered(owner);
  await markLanternFolderDiscovered(owner);
  await markArchiveFlag("copyUnlocked", owner);
  return fieldNotes;
}

// Match complete questions. Ordinary tutoring can share vocabulary with a clue.
const questions = {
  entry: /^(?:(?:you said |the (?:acrostic|cursors?) (?:says?|spells?) )?she was here first|(?:tell me about |read )?(?:noras )?last lantern(?: signal)?)$/,
  resume: /^(?:where (?:did (?:i|we) leave off|(?:am i|are we)) (?:in|with) (?:the )?(?:nova |lantern )?archive|(?:resume|continue|recap) (?:the |my )?(?:nova |lantern )?archive)$/,
  help: /^(?:what (?:do you|does that) mean|what (?:comes next|should i look for)|where (?:do i look|did (?:i|we) leave off)|(?:give me |i need )?(?:a )?(?:hint|nudge)|im stuck)$/,
  garden: /^(?:read|show me) (?:the |her )?(?:starlight )?garden note$/,
  count: /^(?:what (?:(?:i|you|she) (?:was|were) counting|(?:were you|was (?:she|i|nv|nora)) counting)|what did (?:she|nv|nora) count|(?:what does|explain) the garden note(?: mean)?|why (?:didnt|doesnt) (?:her|the) (?:star )?count match (?:the|her) chart)$/,
  telescope: /^(?:read|show me) (?:the )?telescope (?:observation|record|notes?)$/,
  signature: /^(?:who (?:drew|added|marked|signed) (?:the |that )?(?:(?:extra|missing|seventeenth|17th|pencil) (?:star|mark)|(?:marked |star )?chart|chart copy)|whose (?:handwriting|initials|signature) (?:is|was|are|were) (?:it|that|on (?:the |her )?(?:chart|copy)|under (?:the |that )?(?:mark|star))|(?:why (?:is|are|was|were)|i found|what about|tell me about|which) (?:there |the )?(?:seventeenth star|17 (?:and 16 )?stars))$/,
  initials: /^(?:(?:who|what) (?:was|is) nv|who (?:were|are) (?:the initials |the letters )?nv|what (?:does|did) nv (?:mean|stand for)|nv)$/,
  rabbit: /^(?:why (?:did|would) (?:she|nv|nora) (?:keep|save) (?:the |her )?(?:white )?(?:rabbit|bunny)|(?:ask about|what (?:was|about)) (?:the )?white (?:rabbit|bunny)(?: for)?|who (?:really |actually )?(?:mended|fixed|repaired|stitched|sewed) (?:the |her )?(?:white )?(?:rabbits? |bunnys? )?ear|(?:did (?:you|nora|nv)|nora) (?:really )?(?:repair|mend|fix|mended|repaired|fixed) (?:the |her )?(?:rabbits? |bunnys? )?ear)$/,
  margin: /^(?:read|show me) (?:the )?focus practice (?:margin|note)$/,
  mistakes: /^(?:why (?:(?:did|would) )?(?:she|nora|nv) (?:keep|kept|save|saved|write|wrote) (?:what she almost believed|what i almost believed|(?:her |the |a )?(?:wrong|crossed out|first) answers?)|(?:what (?:does|did)|explain|tell me about) the focus practice margin(?: mean)?|what did (?:she|nora) almost believe)$/,
  notebook: /^(?:read|show me) (?:noras|nvs|the island library) notebook$/,
  copy: /^(?:where (?:did|would) (?:she|nora|nv) (?:keep|put|save|hide|file) (?:her |the )?(?:first (?:answer|draft)|crossed out (?:page|answer)|original (?:page|answer))|where is the lantern copy|open (?:the )?lantern archive|tell me about noras notebook)$/,
  solution: /^(?:(?:find|open|restore|recover|read) (?:the )?(?:copy (?:called|marked|labeled) )?|(?:the (?:copy|two fields|words) (?:is|are|say) )?)unerased first draft$/,
  reversed: /^(?:(?:find|open|restore|recover|read) (?:the )?)?first draft unerased$/,
  stampOnly: /^(?:(?:the )?(?:unindexed )?stamp (?:is|says) )?unerased$/,
  labelOnly: /^(?:(?:the )?(?:crossed out )?label (?:is|says) )?first draft$/,
  invite: /^(?:where is|find|open|restore|recover|read) (?:the )?(?:lantern copy|first draft)$/,
  ending: /^(?:what (?:she|nova) got wrong|what did (?:you|nova|she) get wrong in session 0?17|(?:read|replay) session 0?17)$/,
  plainEnding: /^what (?:did you get|you got) wrong$/,
  earlyDeduction: /^(?:were (?:those|these|they) (?:actually |really )?her memories|whose (?:hands|memories) were (?:those|they)|so (?:she|nora) (?:drew|signed) the (?:star|chart))$/,
};

function isMemoryDeduction(q: string): boolean {
  const idea = q.replace(/^(?:i think (?:that )?|maybe |so |it sounds like )/, "");
  return [
    /^(?:were (?:those|these|they)|those were|these were|they were|you have) (?:actually |really )?(?:noras|her) memories(?: all along| not yours)?$/,
    /^(?:you(?:re| are| were)? (?:remembering|remembered)|did you (?:remember|mistake)) (?:noras|her) (?:life|memories)(?: (?:as|for) your own)?$/,
    /^you (?:thought|believed) (?:noras|her) memories were (?:your own|yours)$/,
    /^(?:(?:was|is) (?:the|that) memory|(?:the|those|your) memories (?:were|are)) (?:really )?noras(?: not yours)?$/,
    /^whose (?:life|memories) (?:were|are) you remembering$/,
    /^nora (?:fixed|mended|repaired) the (?:ear|rabbit) but you remember doing it$/,
    /^(?:you (?:have|carry|inherited|are carrying)|did you inherit) (?:noras|nora vales) memories(?: not your own)?$/,
    /^(?:you (?:confused|mistook) (?:noras|her) memories (?:with|for) (?:your own|yours)|you thought you were nora|you remember things that happened to nora not you)$/,
  ].some(pattern => pattern.test(idea));
}

const storyForms = Object.values(questions);
const textReply = (text: string): ArchiveReply => ({ text });

function nextLead(state: ArgDiscoveryState, flags: ArchiveFlags): ArchiveReply {
  if (flags.completed) return { text: SESSION_REVEAL, framed: true };
  if (flags.draftRestored) return restored;
  if (flags.copyUnlocked) return fieldNotes;
  if (state.libraryNotebookDiscovered) return textReply("The corrected page survived. Ask where Nora saved the first answer.");
  if (state.libraryNotebookUnlocked) return textReply(notebookHint);
  if (state.focusPracticeNoteDiscovered) return textReply("The margin says to keep what she almost believed. Why would Nora save a wrong answer?");
  if (state.focusPracticeUnlocked) return textReply(focusHint);
  if (state.whiteRabbitDiscovered) return textReply("The label and the star chart bear the same initials. Who really mended the rabbit’s ear?");
  if (state.whiteRabbitClueUnlocked) return textReply(rabbitHint);
  if (state.nvDiscovered) return textReply("N.V. signed the chart. Ask who N.V. was.");
  if (state.seventeenthStarDiscovered) return textReply("Look just under the seventeenth star on the copy. Who signed the chart?");
  if (state.telescopeClueUnlocked) return textReply(telescopeHint);
  if (state.entryNoteDiscovered) return textReply("The note asks you to compare what she saw with what was printed. What was Nora counting?");
  return textReply(gardenHint);
}

// The older Island dialogue has some short follow-ups with meaning only in a story exchange.
export function isLegacyArchiveQuestion(input: string, followingArchive: boolean): boolean {
  const q = normalizeArchivePrompt(input);
  if (followingArchive && /^(?:where|why|which|where should i look|what (?:does that mean|do you mean|was it called|happened to them)|where are the wrong answers)$/.test(q)) return true;
  if (/\bnv\b/.test(q) && classifyNvEntryPrompt(input)) return true;
  return /^(?:what (?:were|are) the (?:initials|letters)|which initials|who (?:drew|added) the star|what about the (?:extra|missing|seventeenth) star|where (?:is|can i find) the white (?:rabbit|bunny)|what was her project|what did the notebook mean|why (?:keep |did she keep )?both(?: answers| versions| pages)?|where (?:did she (?:put|keep|save)|was) the copy|what was in the (?:first )?file|(?:tell me about|where is) the lantern folder)$/.test(q);
}

export async function resolveArchiveReply(input: string, inSessionContext = false, followingArchive = inSessionContext, owner: ArgOwner = null): Promise<ArchiveReply | null> {
  const q = normalizeArchivePrompt(input);
  const memoryDeduction = isMemoryDeduction(q);
  // Evidence can be expressed as an observation, not only a password.
  // Restrict the alternative to archive context and require both identifiers.
  const evidenceSolution = followingArchive && /^(?:(?:the )?(?:unindexed )?(?:frame|stamp)(?: 17)? (?:is|says|was|reads) )?unerased (?:and|with) (?:the )?(?:(?:relay|answer|page|label|draft) (?:is|says|was|reads) )?first draft$/.test(q);
  if (!memoryDeduction && !evidenceSolution && !storyForms.some(form => form.test(q)) && !(/\bnv\b/.test(q) && classifyNvEntryPrompt(input))) return null;
  const [flags, state] = await Promise.all([getArchiveFlags(owner), getArgDiscoveryState(owner)]);

  if (questions.entry.test(q)) {
    await markArchiveFlag("introduced", owner);
    return textReply(gardenHint);
  }
  if (questions.garden.test(q) && (flags.introduced || state.entryNoteDiscovered)) {
    await markEntryNoteDiscovered(owner);
    return textReply(GARDEN_NOTE);
  }
  if (!state.entryNoteDiscovered && !flags.introduced) return null;
  if (questions.resume.test(q) || (followingArchive && questions.help.test(q))) return nextLead(state, flags);
  if (!state.entryNoteDiscovered) return null;

  if (questions.count.test(q)) {
    await markTelescopeClueUnlocked(owner);
    return textReply(telescopeHint);
  }
  if (questions.telescope.test(q) && state.telescopeClueUnlocked) {
    await markSeventeenthStarDiscovered(owner);
    return textReply([TELESCOPE.count, TELESCOPE.chart, TELESCOPE.note, starHandoff].join("\n\n"));
  }
  if (state.seventeenthStarDiscovered && questions.signature.test(q)) {
    await markNvDiscovered(owner);
    return textReply(initialsReply);
  }
  if (state.nvDiscovered && /\bnv\b/.test(q) && classifyNvEntryPrompt(input)) {
    return textReply("I recognize N.V.’s correction. If you want to know who left it, ask me who N.V. was.");
  }
  if (state.nvDiscovered && questions.initials.test(q)) {
    await markWhiteRabbitClueUnlocked(owner);
    return textReply(rabbitHint);
  }
  if (state.whiteRabbitDiscovered && questions.rabbit.test(q)) {
    await markFocusPracticeUnlocked(owner);
    return textReply(focusHint);
  }
  if (state.focusPracticeUnlocked && questions.margin.test(q)) {
    await markFocusPracticeNoteDiscovered(owner);
    return textReply(FOCUS_MARGIN);
  }
  if (state.focusPracticeNoteDiscovered && questions.mistakes.test(q)) {
    await markLibraryNotebookUnlocked(owner);
    return textReply(notebookHint);
  }
  if (state.libraryNotebookUnlocked && questions.notebook.test(q)) {
    await markLibraryNotebookDiscovered(owner);
    return textReply(NORA_NOTEBOOK);
  }
  if (state.libraryNotebookDiscovered && questions.copy.test(q)) return openLanternFieldNotes(owner);
  if (flags.copyUnlocked && flags.copyRead) {
    if (questions.solution.test(q) || evidenceSolution) {
      await markArchiveFlag("draftRestored", owner);
      return restored;
    }
    if (questions.reversed.test(q)) return { ...fieldNotes, text: "Both words are on the right scraps. Look at the recovery order. Which field comes first?" };
    if (questions.stampOnly.test(q)) return { ...fieldNotes, text: "That matches the pencil stamp. What did N.V. call the crossed-out page in the relay? Put that label after the stamp." };
    if (questions.labelOnly.test(q)) return { ...fieldNotes, text: "That’s the relay label. Which stamp is on the contact sheet’s one unindexed frame? Put it first." };
  }
  if (flags.draftRestored && (questions.ending.test(q) || memoryDeduction || (inSessionContext && questions.plainEnding.test(q)))) {
    await markArgAct1Complete(owner);
    await markArchiveFlag("completed", owner);
    return { text: SESSION_REVEAL, framed: true, finished: true };
  }
  if (flags.copyUnlocked && (questions.invite.test(q) || questions.solution.test(q))) return fieldNotes;
  if ((memoryDeduction || (followingArchive && questions.earlyDeduction.test(q))) && state.nvDiscovered) {
    const lead = nextLead(state, flags);
    return { ...lead, text: "That would explain the handwriting. It's a theory worth testing against another signed record, or the answer she asked me to save. Let’s see what she kept.\n\n" + lead.text };
  }
  return null;
}
