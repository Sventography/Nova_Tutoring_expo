import type { ArgDiscoveryState } from "../utils/argState";

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
export function getArgEvidenceTrail(state: ArgDiscoveryState): {
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
      observation: "Someone expected to doubt her own star count tomorrow. She kept the original chart even after drawing a correction.",
      unresolved: "Why would a small correction be worth preserving?",
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
      observation: "N.V. isn't a system label. Nova can recall a battered white rabbit more easily than the person who owned it.",
      unresolved: "Why does an ordinary possession survive when the name doesn't?",
      nudge: "Look for the white rabbit in the Shop. It isn't necessary to buy anything. Hold on to its name.",
      discovered: state.nvDiscovered,
    },
    {
      id: "rabbit",
      title: "04 / Not for studying",
      observation: "The rabbit's old label uses the same initials as the chart. Both were kept even though someone considered them useless.",
      unresolved: "What else did she insist on keeping?",
      nudge: "Ask Nova why she kept the rabbit and what happened to her wrong answers.",
      discovered: state.whiteRabbitDiscovered,
    },
    {
      id: "mistakes",
      title: "05 / The first answer",
      observation: "The crossed-out answers weren't distractions. They showed what she believed before she changed her mind.",
      unresolved: "Where did she leave the original record?",
      nudge: "Ask Nova about N.V.'s project and notebook, then look in the Island Library.",
      discovered: state.focusPracticeNoteDiscovered,
    },
    {
      id: "notebook",
      title: "06 / Two versions",
      observation: "She knew the corrected answer, but couldn't remember the moment she changed her mind. She asked Nova to keep both.",
      unresolved: "Why wasn't the corrected page enough?",
      nudge: "Ask Nova why she kept both answers. Don't stop at the correction.",
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
      observation: "Lantern was the name of the light near the telescope—and a folder containing SESSION_017.",
      unresolved: "What did the file contain that someone wanted discarded?",
      nudge: "Ask Nova what was in the first file.",
      discovered: !!state.lanternFolderDiscovered,
    },
    {
      id: "preserved",
      title: "09 / FILE 01: PRESERVED",
      observation: "QUIET marked a personal record unimportant. Nova was told to discard the crossed-out answer. She kept it.",
      unresolved: "Who gave QUIET authority over what counted as important?",
      nudge: "The file is preserved. The origin of the instruction belongs to another chapter.",
      discovered: !!state.argAct1Complete,
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
    nextNudge: latest?.nudge || null,
    completed: !!state.argAct1Complete,
  };
}
