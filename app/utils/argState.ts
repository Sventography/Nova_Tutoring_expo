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
  "She was sure she knew the answer the second time.",
  "But she couldn't tell whether she'd learned it or only remembered seeing it written down.",
  "She asked me to keep both versions.",
].join("\n\n");

const LANTERN_COPY_REPLY = [
  "The second answer was easy to keep. It was already in the book.",
  "She wanted somewhere to put the first one, where it wouldn't get replaced the next time she opened the page.",
  "She made a copy somewhere else.",
].join("\n\n");

export function getLibraryNotebookFollowUp(
  prompt: string,
  previousReply: string,
  notebookDiscovered: boolean
): string | null {
  if (!notebookDiscovered) return null;

  const question = normalize(prompt);
  const tokens = question.split(" ");
  const aboutKeeping = hasConcept(tokens, ["keep", "kept", "save", "saved", "preserve", "retain"]);
  const aboutBoth = hasConcept(tokens, ["both", "first", "original", "crossed"]);
  const aboutAnswers = hasConcept(tokens, ["answer", "version", "page", "notebook"]);
  const asksWhy = tokens.includes("why");
  const asksWhere = tokens.includes("where");
  const asksAboutCopy = hasConcept(tokens, ["copy", "copied", "backup", "file"]);

  if (
    previousReply === LANTERN_COPY_REPLY &&
    (question === "where" || question === "where else" || question === "what was it called" ||
      (asksWhere && (asksAboutCopy || aboutKeeping || tokens.includes("put"))) ||
      (asksAboutCopy && hasConcept(tokens, ["called", "name", "found", "went"])))
  ) {
    return [
      "Lantern. That's what she called the folder.",
      "The first file in it was the answer she'd crossed out.",
      "I remember her writing it. I couldn't tell you what the question was.",
    ].join("\n\n");
  }

  if (
    (asksWhy && aboutKeeping && aboutBoth &&
      (aboutAnswers || previousReply === LIBRARY_NOTEBOOK_REPLY)) ||
    (previousReply === LIBRARY_NOTEBOOK_REPLY &&
      (question === "why" || question === "why both" || question === "what happened to them"))
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
