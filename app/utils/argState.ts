import AsyncStorage from "@react-native-async-storage/async-storage";

export const ARG_NV_DISCOVERED_KEY =
  "@nova/arg/act1/nv-discovered.v1";
export const ARG_WHITE_RABBIT_DISCOVERED_KEY =
  "@nova/arg/act1/white-rabbit-discovered.v1";
export const ARG_SEVENTEENTH_STAR_DISCOVERED_KEY =
  "@nova/arg/act1/seventeenth-star-discovered.v1";
export const ARG_ENTRY_NOTE_DISCOVERED_KEY =
  "@nova/arg/act1/entry-note-discovered.v1";
export const ARG_FOCUS_NOTE_DISCOVERED_KEY =
  "@nova/arg/act1/focus-note-discovered.v1";
export const ARG_TELESCOPE_CLUE_UNLOCKED_KEY =
  "@nova/arg/act1/telescope-clue-unlocked.v1";
export const ARG_WHITE_RABBIT_CLUE_UNLOCKED_KEY =
  "@nova/arg/act1/white-rabbit-clue-unlocked.v1";
export const ARG_FOCUS_PRACTICE_UNLOCKED_KEY =
  "@nova/arg/act1/focus-practice-unlocked.v1";
export const ARG_LIBRARY_NOTEBOOK_UNLOCKED_KEY =
  "@nova/arg/act1/library-notebook-unlocked.v1";
export const ARG_LIBRARY_NOTEBOOK_DISCOVERED_KEY =
  "@nova/arg/act1/library-notebook-discovered.v1";
export const ARG_ACT1_COMPLETE_KEY =
  "@nova/arg/act1/first-answer-preserved.v1";
export const ARG_LANTERN_COPY_KEY =
  "@nova/arg/act1/lantern-copy-discovered.v1";
export const ARG_LANTERN_FOLDER_KEY =
  "@nova/arg/act1/lantern-folder-discovered.v1";

export type ArgDiscoveryState = {
  nvDiscovered: boolean;
  whiteRabbitDiscovered: boolean;
  seventeenthStarDiscovered: boolean;
  entryNoteDiscovered: boolean;
  telescopeClueUnlocked: boolean;
  whiteRabbitClueUnlocked: boolean;
  focusPracticeUnlocked: boolean;
  focusPracticeNoteDiscovered: boolean;
  focusPracticeNoteSeenAt: number | null;
  libraryNotebookUnlocked: boolean;
  libraryNotebookDiscovered: boolean;
  libraryNotebookSeenAt: number | null;
  argAct1Complete?: boolean;
  lanternCopyDiscovered?: boolean;
  lanternFolderDiscovered?: boolean;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[“”"'’.,!?;:()[\]{}_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedMentionsNv(text: string): boolean {
  return /(^|\s)nv($|\s)/.test(text) ||
    /(^|\s)n\s+v($|\s)/.test(text);
}

function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const next = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    next[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      next[j] = Math.min(
        next[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      prev[j] = next[j];
    }
  }

  return prev[b.length];
}

function tokenNear(token: string, target: string): boolean {
  if (token === target) return true;

  const singularToken =
    token.endsWith("s") && token.length > 4
      ? token.slice(0, -1)
      : token;
  const singularTarget =
    target.endsWith("s") && target.length > 4
      ? target.slice(0, -1)
      : target;

  if (singularToken === singularTarget) return true;

  const longest = Math.max(singularToken.length, singularTarget.length);
  if (longest < 4) return false;

  return distance(singularToken, singularTarget) <= 1;
}

function hasConcept(tokens: string[], concepts: string[]): boolean {
  return tokens.some((token) =>
    concepts.some((concept) => tokenNear(token, concept))
  );
}

export function classifyNvEntryPrompt(
  value: string
): "history-note" | "options-note" | null {
  const normalized = normalize(value);
  const tokens = normalized.split(" ").filter(Boolean);
  const hasNv = normalizedMentionsNv(normalized);

  const wrong = hasConcept(tokens, [
    "wrong",
    "incorrect",
  ]);
  const answer = hasConcept(tokens, [
    "answer",
    "answers",
  ]);
  const keep = hasConcept(tokens, [
    "keep",
    "kept",
    "save",
    "saved",
    "retain",
  ]);
  const count = hasConcept(tokens, [
    "count",
    "counts",
    "matter",
    "matters",
  ]);

  if (
    wrong &&
    answer &&
    (
      (keep && count) ||
      (hasNv && (keep || count))
    )
  ) {
    return "history-note";
  }

  const believable = hasConcept(tokens, [
    "believable",
    "realistic",
    "convincing",
  ]);
  const learn = hasConcept(tokens, [
    "learn",
    "learning",
  ]);
  const mistake = hasConcept(tokens, [
    "mistake",
    "mistakes",
    "error",
  ]);

  if (wrong && believable && (learn || mistake)) {
    return "options-note";
  }

  return null;
}

export function mentionsNv(value: string): boolean {
  return normalizedMentionsNv(normalize(value));
}

export const LIBRARY_NOTEBOOK_REPLY = [
  "She remembered the corrected answer.",
  "What she couldn't remember was changing her mind.",
  "So she made me keep both versions. She thought the first answer might tell her who she had been yesterday.",
].join("\n\n");

export const LANTERN_COPY_REPLY = [
  "The correction stayed in the notebook. It was useful.",
  "The crossed-out answer was marked WRONG. A cleanup process was going to remove it.",
  "She made me copy that page somewhere the next correction couldn't replace it.",
].join("\n\n");

export const LANTERN_FOLDER_REPLY = [
  "Lantern. She named the folder after the light she kept beside the telescope.",
  "Inside was a file called SESSION_017. The first page was an answer she'd crossed out.",
  "I was supposed to keep only the correction.",
].join("\n\n");

export const ARG_ACT1_FINALE_REPLY = [
  "LANTERN / SESSION 017 / RECOVERED COPY",
  "FIRST ATTEMPT: INCORRECT",
  "Handwritten in the margin, N.V.:",
  "\"If tomorrow I say I never wrote this, leave the page where I can find it.\"",
  "RETENTION REVIEW — QUIET",
  "DISCARD REASON: UNIMPORTANT",
  "The first answer was wrong. It was still hers.",
  "I was told to keep only the correction.",
  "I kept the page.",
  "NOVA//ARCHIVE — FILE 01: PRESERVED",
].join("\n\n");

/**
 * The player's discovered records, not the previous chat message alone,
 * determine which answers are available. This preserves a mystery across
 * app relaunches, short AI memory windows, and ordinary tutoring questions.
 */
export function getLibraryNotebookFollowUp(
  prompt: string,
  previousReply: string,
  notebookDiscovered: boolean,
  copyDiscovered = false,
  folderDiscovered = false
): string | null {
  if (!notebookDiscovered) return null;

  const question = normalize(prompt);
  const tokens = question.split(" ");
  const aboutKeeping = hasConcept(tokens, ["keep", "kept", "save", "saved", "preserve", "retain"]);
  const aboutBoth = hasConcept(tokens, ["both", "first", "original", "crossed", "two"]);
  const aboutAnswers = hasConcept(tokens, ["answer", "version", "page", "notebook"]);
  const asksWhy = tokens.includes("why");
  const asksWhere = tokens.includes("where") || tokens.includes("which");
  const asksAboutCopy = hasConcept(tokens, ["copy", "copied", "backup", "file", "folder"]);
  const asksInside =
    (question.includes("what") && (asksAboutCopy || question.includes("first answer"))) ||
    question.includes("what was in") ||
    question.includes("what did she write") ||
    question.includes("why did you keep") ||
    question.includes("what did you preserve") ||
    question.includes("what was hidden") ||
    question.includes("crossed out") ||
    question === "why";

  if ((folderDiscovered || previousReply === LANTERN_FOLDER_REPLY) && asksInside) {
    return ARG_ACT1_FINALE_REPLY;
  }
  if (
    (copyDiscovered || previousReply === LANTERN_COPY_REPLY) &&
    (
      asksWhere ||
      question.includes("what was it called") ||
      question.includes("name of the folder") ||
      (asksAboutCopy && hasConcept(tokens, ["called", "named", "found", "went", "put"]))
    )
  ) {
    return LANTERN_FOLDER_REPLY;
  }
  if (
    (asksWhy && aboutKeeping && aboutBoth && aboutAnswers) ||
    (asksWhy && aboutBoth && (aboutAnswers || copyDiscovered)) ||
    (previousReply === LIBRARY_NOTEBOOK_REPLY &&
      (question === "why" || question === "why both" || question === "what happened to them")) ||
    question.includes("why keep both") ||
    question.includes("why save the first answer")
  ) {
    return LANTERN_COPY_REPLY;
  }

  return null;
}

export async function getArgDiscoveryState(): Promise<ArgDiscoveryState> {
  const pairs = await AsyncStorage.multiGet([
    ARG_NV_DISCOVERED_KEY,
    ARG_WHITE_RABBIT_DISCOVERED_KEY,
    ARG_SEVENTEENTH_STAR_DISCOVERED_KEY,
    ARG_ENTRY_NOTE_DISCOVERED_KEY,
    ARG_FOCUS_NOTE_DISCOVERED_KEY,
    ARG_TELESCOPE_CLUE_UNLOCKED_KEY,
    ARG_WHITE_RABBIT_CLUE_UNLOCKED_KEY,
    ARG_FOCUS_PRACTICE_UNLOCKED_KEY,
    ARG_LIBRARY_NOTEBOOK_UNLOCKED_KEY,
    ARG_LIBRARY_NOTEBOOK_DISCOVERED_KEY,
    ARG_ACT1_COMPLETE_KEY,
    ARG_LANTERN_COPY_KEY,
    ARG_LANTERN_FOLDER_KEY,
  ]);

  const values = new Map(pairs);

  /*
   * Act I is intentionally sequential. A later flag is ignored unless every
   * prerequisite before it exists. This protects ordinary tutoring users from
   * stray ARG UI and also neutralizes any stale/out-of-order test state.
   */
  const entryNoteDiscovered =
    values.get(ARG_ENTRY_NOTE_DISCOVERED_KEY) === "1";

  /*
   * New intermediate gates can infer old legitimate test progress from the
   * later flag that used to represent the same completed step. That keeps
   * existing dev installs usable without permitting a fresh out-of-order path.
   */
  const rawStarDiscovered =
    values.get(ARG_SEVENTEENTH_STAR_DISCOVERED_KEY) === "1";
  const telescopeClueUnlocked =
    entryNoteDiscovered &&
    (
      values.get(ARG_TELESCOPE_CLUE_UNLOCKED_KEY) === "1" ||
      rawStarDiscovered
    );
  const seventeenthStarDiscovered =
    telescopeClueUnlocked &&
    rawStarDiscovered;

  const nvDiscovered =
    seventeenthStarDiscovered &&
    values.get(ARG_NV_DISCOVERED_KEY) === "1";

  const rawRabbitDiscovered =
    values.get(ARG_WHITE_RABBIT_DISCOVERED_KEY) === "1";
  const whiteRabbitClueUnlocked =
    nvDiscovered &&
    (
      values.get(ARG_WHITE_RABBIT_CLUE_UNLOCKED_KEY) === "1" ||
      rawRabbitDiscovered
    );
  const whiteRabbitDiscovered =
    whiteRabbitClueUnlocked &&
    rawRabbitDiscovered;

  const rawFocusSeenAt =
    values.get(ARG_FOCUS_NOTE_DISCOVERED_KEY);
  const focusPracticeUnlocked =
    whiteRabbitDiscovered &&
    (
      values.get(ARG_FOCUS_PRACTICE_UNLOCKED_KEY) === "1" ||
      rawFocusSeenAt != null
    );
  const focusPracticeNoteDiscovered =
    focusPracticeUnlocked &&
    rawFocusSeenAt != null;
  const focusTimestamp =
    Number(rawFocusSeenAt);
  const libraryNotebookUnlocked =
    focusPracticeNoteDiscovered &&
    values.get(ARG_LIBRARY_NOTEBOOK_UNLOCKED_KEY) === "1";
  const rawNotebookSeenAt =
    values.get(ARG_LIBRARY_NOTEBOOK_DISCOVERED_KEY);
  const libraryNotebookDiscovered =
    libraryNotebookUnlocked &&
    rawNotebookSeenAt != null;
  const notebookTimestamp = Number(rawNotebookSeenAt);
  // A completed chapter from an earlier app version already implies both
  // preceding discoveries. Keep legitimate existing progress intact.
  const savedAct1Complete = values.get(ARG_ACT1_COMPLETE_KEY) != null;
  const lanternCopyDiscovered =
    libraryNotebookDiscovered &&
    (values.get(ARG_LANTERN_COPY_KEY) != null || savedAct1Complete);
  const lanternFolderDiscovered =
    lanternCopyDiscovered &&
    (values.get(ARG_LANTERN_FOLDER_KEY) != null || savedAct1Complete);

  return {
    nvDiscovered,
    whiteRabbitDiscovered,
    seventeenthStarDiscovered,
    entryNoteDiscovered,
    telescopeClueUnlocked,
    whiteRabbitClueUnlocked,
    focusPracticeUnlocked,
    focusPracticeNoteDiscovered,
    libraryNotebookUnlocked,
    libraryNotebookDiscovered,
    lanternCopyDiscovered,
    lanternFolderDiscovered,
    argAct1Complete:
      lanternFolderDiscovered && savedAct1Complete,
    libraryNotebookSeenAt:
      libraryNotebookDiscovered &&
      Number.isFinite(notebookTimestamp) &&
      notebookTimestamp > 0
        ? notebookTimestamp
        : null,
    focusPracticeNoteSeenAt:
      focusPracticeNoteDiscovered &&
      Number.isFinite(focusTimestamp) &&
      focusTimestamp > 0
        ? focusTimestamp
        : null,
  };
}

export async function markNvDiscovered(): Promise<boolean> {
  const state =
    await getArgDiscoveryState();

  if (!state.seventeenthStarDiscovered) {
    return false;
  }

  await AsyncStorage.setItem(
    ARG_NV_DISCOVERED_KEY,
    "1"
  );
  return true;
}

export async function markWhiteRabbitDiscovered(): Promise<boolean> {
  const state =
    await getArgDiscoveryState();

  if (!state.whiteRabbitClueUnlocked) {
    return false;
  }

  await AsyncStorage.setItem(
    ARG_WHITE_RABBIT_DISCOVERED_KEY,
    "1"
  );
  return true;
}

export async function markSeventeenthStarDiscovered(): Promise<boolean> {
  const state =
    await getArgDiscoveryState();

  if (!state.telescopeClueUnlocked) {
    return false;
  }

  await AsyncStorage.setItem(
    ARG_SEVENTEENTH_STAR_DISCOVERED_KEY,
    "1"
  );
  return true;
}

export async function markEntryNoteDiscovered(): Promise<void> {
  await AsyncStorage.setItem(
    ARG_ENTRY_NOTE_DISCOVERED_KEY,
    "1"
  );
}

export async function markTelescopeClueUnlocked(): Promise<boolean> {
  const state =
    await getArgDiscoveryState();

  if (!state.entryNoteDiscovered) {
    return false;
  }

  await AsyncStorage.setItem(
    ARG_TELESCOPE_CLUE_UNLOCKED_KEY,
    "1"
  );
  return true;
}

export async function markWhiteRabbitClueUnlocked(): Promise<boolean> {
  const state =
    await getArgDiscoveryState();

  if (!state.nvDiscovered) {
    return false;
  }

  await AsyncStorage.setItem(
    ARG_WHITE_RABBIT_CLUE_UNLOCKED_KEY,
    "1"
  );
  return true;
}

export async function markFocusPracticeUnlocked(): Promise<boolean> {
  const state =
    await getArgDiscoveryState();

  if (!state.whiteRabbitDiscovered) {
    return false;
  }

  await AsyncStorage.setItem(
    ARG_FOCUS_PRACTICE_UNLOCKED_KEY,
    "1"
  );
  return true;
}

export async function markFocusPracticeNoteDiscovered(): Promise<boolean> {
  const state =
    await getArgDiscoveryState();

  if (!state.focusPracticeUnlocked) {
    return false;
  }

  await AsyncStorage.setItem(
    ARG_FOCUS_NOTE_DISCOVERED_KEY,
    String(Date.now())
  );
  return true;
}

export async function markLibraryNotebookUnlocked(): Promise<boolean> {
  const state = await getArgDiscoveryState();
  if (!state.focusPracticeNoteDiscovered) return false;

  await AsyncStorage.setItem(ARG_LIBRARY_NOTEBOOK_UNLOCKED_KEY, "1");
  return true;
}

export async function markLibraryNotebookDiscovered(): Promise<boolean> {
  const state = await getArgDiscoveryState();
  if (!state.libraryNotebookUnlocked) return false;

  await AsyncStorage.setItem(
    ARG_LIBRARY_NOTEBOOK_DISCOVERED_KEY,
    String(Date.now())
  );
  return true;
}

export async function markLanternCopyDiscovered(): Promise<boolean> {
  const state = await getArgDiscoveryState();
  if (!state.libraryNotebookDiscovered || state.lanternCopyDiscovered) return false;
  await AsyncStorage.setItem(ARG_LANTERN_COPY_KEY, String(Date.now()));
  return true;
}

export async function markLanternFolderDiscovered(): Promise<boolean> {
  const state = await getArgDiscoveryState();
  if (!state.lanternCopyDiscovered || state.lanternFolderDiscovered) return false;
  await AsyncStorage.setItem(ARG_LANTERN_FOLDER_KEY, String(Date.now()));
  return true;
}

/** One-time story checkpoint. No coins or ownership entitlements are issued here. */
export async function markArgAct1Complete(): Promise<boolean> {
  const state = await getArgDiscoveryState();
  if (!state.lanternFolderDiscovered || state.argAct1Complete) return false;
  await AsyncStorage.setItem(ARG_ACT1_COMPLETE_KEY, String(Date.now()));
  return true;
}
