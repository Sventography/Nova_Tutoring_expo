import type { ArchiveFlags, ArgDiscoveryState } from "../utils/argState";

export type ArgEvidence = {
  id: string;
  title: string;
  observation: string;
  unresolved: string;
  nudge: string;
  discovered: boolean;
};

/**
 * An earned evidence record, not a walkthrough. No future titles are shown.
 * Each recovered item answers one question and points to the next.
 */
export function getArgEvidenceTrail(state: ArgDiscoveryState, flags: ArchiveFlags): {
  found: ArgEvidence[];
  total: number;
  nextQuestion: string | null;
  nextNudge: string | null;
  completed: boolean;
} {
  const steps: ArgEvidence[] = [
    {
      id: "chart",
      title: "01 / The count",
      observation: "Someone expected to forget making a mark tomorrow. She deliberately kept both the marked copy and the untouched original.",
      unresolved: "Why would remembering that she made a mark matter more than correcting the count?",
      nudge: "Ask Nova what was counted. A telescope and a lantern belonged together.",
      discovered: state.entryNoteDiscovered,
    },
    {
      id: "mark",
      title: "02 / The seventeenth mark",
      observation: "The additional star was drawn by hand on a copy. The printed chart was never changed. There is a signature near the mark.",
      unresolved: "Whose hand was on the page?",
      nudge: "Ask Nova about the hand-drawn star, who added it, and the initials.",
      discovered: state.seventeenthStarDiscovered,
    },
    {
      id: "initials",
      title: "03 / Two initials",
      observation: "N.V. signed the chart. Nova remembers pressing the pencil into the page.",
      unresolved: "Why does Nova remember drawing a mark that someone else signed?",
      nudge: "Ask Nova who N.V. was.",
      discovered: state.nvDiscovered,
    },
    {
      id: "rabbit",
      title: "04 / Not for studying",
      observation: "N.V. signed the rabbit’s label and wrote that she mended its ear. Nova remembers feeling the knot against her own cheek.",
      unresolved: "Two separate signed records contradict Nova’s first-person memories. Whose experiences is she remembering?",
      nudge: "Ask Nova who really mended the rabbit’s ear.",
      discovered: state.whiteRabbitDiscovered,
    },
    {
      id: "mistakes",
      title: "05 / The first answer",
      observation: "The crossed-out answers weren't distractions. They showed what she believed before she changed her mind.",
      unresolved: "What would Nora lose if only her correct answers survived?",
      nudge: "Ask Nova why Nora saved her wrong answers.",
      discovered: state.focusPracticeNoteDiscovered,
    },
    {
      id: "notebook",
      title: "06 / Two versions",
      observation: "The notebook refers back to the telescope charts. Nora knew the corrected answer but couldn't remember changing her mind. Her first attempt was filed with the marked chart.",
      unresolved: "Can the missing answer show why she needed both charts?",
      nudge: "Ask Nova where Nora saved her first answer.",
      discovered: state.libraryNotebookDiscovered,
    },
    {
      id: "copy",
      title: "07 / The surviving copy",
      observation: "A cleanup process would have removed the wrong answer. She arranged for a second copy outside the lesson.",
      unresolved: "Where could a record survive a cleanup?",
      nudge: "Ask Nova where she stored the copied page.",
      discovered: !!state.lanternCopyDiscovered,
    },
    {
      id: "folder",
      title: "08 / Lantern",
      observation: "The folder shares its name with the lamp Nora used to compare the charts.",
      unresolved: "What did the file contain that someone wanted discarded?",
      nudge: "Ask Nova to open the Lantern Archive.",
      discovered: !!state.lanternFolderDiscovered,
    },
    {
      id: "field-notes",
      title: "09 / Lantern Field Notes",
      observation: "The contact sheet identifies the marked chart outside the index; the relay identifies the saved version of its answer. Together they locate one missing record.",
      unresolved: "Which two pieces of evidence identify Nora’s original answer?",
      nudge: "Open Lantern Field Notes from Ask Nova. The source note gives the order for the contact sheet and relay.",
      discovered: flags.copyRead,
    },
    {
      id: "preserved",
      title: "10 / The first draft",
      observation: "Nora originally counted her own pencil mark as part of the printed chart. QUIET discarded the first attempt. Nova kept the page.",
      unresolved: "Which part of Nora’s story did Nova misunderstand?",
      nudge: "Tell Nova whose memories you think she has, or ask what she got wrong in Session 017.",
      discovered: flags.draftRestored,
    },
    {
      id: "session",
      title: "11 / Session 017",
      observation: "The knot against her cheek and the pencil in her hand were Nora Vale’s memories. Nova remembered them as her own. She put Nora’s page back.",
      unresolved: "Nova knows whose memories she carries. What does that make her?",
      nudge: "Ask Nova to replay Session 017.",
      discovered: flags.completed,
    },
  ];
  // Sequential states are enforced by getArgDiscoveryState; this filter never
  // exposes unrecovered entries or rewards to ordinary tutoring users.
  const found = steps.filter(step => step.discovered);
  const latest = found[found.length - 1];
  return {
    found,
    total: steps.length,
    nextQuestion: latest?.unresolved || null,
    nextNudge: flags.copyUnlocked && !flags.copyRead
      ? "Open Lantern Field Notes from the framed message in Ask Nova."
      : latest?.nudge || null,
    completed: flags.completed,
  };
}
