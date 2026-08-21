// app/constants/achievements.ts

import { streakAchievementBaseCoins } from "../_lib/economy";
import {
  SUBJECT_KEYS,
  SUBJECT_LABELS,
  normalizeSubjectKey,
  type SubjectKey,
} from "../_lib/topicTaxonomy";

export type Achievement = {
  id: string;
  title: string;
  desc?: string;
  coins: number;
  group: string;
};

function make(
  id: string,
  title: string,
  coins: number,
  group: string,
  desc?: string
): Achievement {
  return { id, title, coins, group, desc };
}

export function subjectKey(s?: string) {
  return normalizeSubjectKey(s);
}

export const SUBJECTS = [...SUBJECT_KEYS];

function subjectLabel(sub: string): string {
  const key = normalizeSubjectKey(sub);
  return SUBJECT_LABELS[key];
}

export function buildAchievements() {
  const list: Achievement[] = [];

  // ────────── ASK milestones ──────────
  for (const n of [
    1, 5, 10, 20, 25, 50, 75, 100,
    150, 200, 250, 300, 400, 500, 750, 1000,
  ]) {
    const coins =
      n <= 25
        ? 10
        : n <= 100
        ? 25
        : n <= 300
        ? 50
        : n <= 750
        ? 100
        : 200;

    list.push(
      make(
        `ask_${n}`,
        `Questions Asked: ${n}`,
        coins,
        "ask",
        `You've asked ${n} questions in Ask.`
      )
    );
  }

  // ────────── STREAK BONUSES ──────────
  for (const d of [
    2, 3, 5, 7, 10, 14, 21, 30,
    50, 75, 100, 150, 200, 250, 300, 365,
  ]) {
    list.push(
      make(
        `streak_${d}`,
        `Daily Streak: ${d}`,
        streakAchievementBaseCoins(d),
        "streaks",
        `Opened Nova ${d} days in a row. Includes a one-time streak milestone bonus.`
      )
    );
  }

  // ────────── GLOBAL QUIZ PERFORMANCE ──────────
  for (const pct of [80, 85, 90, 95, 100]) {
    const coins =
      pct === 80
        ? 60
        : pct === 85
        ? 80
        : pct === 90
        ? 110
        : pct === 95
        ? 150
        : 250;

    list.push(
      make(
        `quiz_${pct}`,
        `Quiz Master ${pct}%`,
        coins,
        "quiz",
        `Scored ${pct}%+ on a quiz.`
      )
    );
  }

  // ────────── PER-SUBJECT QUIZ PERFORMANCE ──────────
  for (const sub of SUBJECTS) {
    for (const pct of [80, 85, 90, 95, 100]) {
      const coins =
        pct === 80
          ? 70
          : pct === 85
          ? 90
          : pct === 90
          ? 120
          : pct === 95
          ? 160
          : 275;

      list.push(
        make(
          `quiz_${sub}_${pct}`,
          `${subjectLabel(sub)} Master ${pct}%`,
          coins,
          "quiz",
          `Scored ${pct}%+ in ${subjectLabel(sub)}.`
        )
      );
    }
  }

  // ────────── GLOBAL QUIZ VOLUME ──────────
  for (const n of [1, 5, 10, 25, 50, 100, 200]) {
    const coins =
      n <= 10
        ? 20
        : n <= 50
        ? 50
        : 120;

    list.push(
      make(
        `quiz_taken_${n}`,
        `Quizzes Taken: ${n}`,
        coins,
        "quiz",
        `You've completed ${n} quizzes.`
      )
    );
  }

  // ────────── PER-SUBJECT QUIZ VOLUME ──────────
  for (const sub of SUBJECTS) {
    for (const n of [1, 5, 10, 25, 50, 100, 200]) {
      const coins =
        n <= 10
          ? 25
          : n <= 50
          ? 60
          : 140;

      list.push(
        make(
          `quiz_taken_${sub}_${n}`,
          `${subjectLabel(sub)} Quizzes: ${n}`,
          coins,
          "quiz",
          `Completed ${n} ${subjectLabel(sub)} quiz${n === 1 ? "" : "zes"}.`
        )
      );
    }
  }

  // ────────── QUIZ ACCURACY / LONG-TERM PROGRESS ──────────
  for (const n of [25, 100, 250, 500, 1000, 2500]) {
    const coins =
      n <= 25
        ? 15
        : n <= 100
        ? 25
        : n <= 250
        ? 40
        : n <= 500
        ? 70
        : n <= 1000
        ? 120
        : 250;

    list.push(
      make(
        `quiz_correct_${n}`,
        `${n.toLocaleString()} Correct Answers`,
        coins,
        "quiz",
        `Answered ${n.toLocaleString()} quiz questions correctly in total.`
      )
    );
  }

  // ────────── REPEATED PERFECT SCORES ──────────
  for (const n of [3, 5, 10, 25, 50]) {
    const coins =
      n <= 3
        ? 25
        : n <= 5
        ? 40
        : n <= 10
        ? 70
        : n <= 25
        ? 140
        : 250;

    list.push(
      make(
        `quiz_perfect_${n}`,
        `Perfect Quizzes: ${n}`,
        coins,
        "quiz",
        `Earned a 100% score on ${n} quizzes.`
      )
    );
  }

  // ────────── TOPIC EXPLORATION ──────────
  for (const n of [3, 5, 10, 25, 50, 100]) {
    const coins =
      n <= 3
        ? 15
        : n <= 5
        ? 25
        : n <= 10
        ? 40
        : n <= 25
        ? 75
        : n <= 50
        ? 125
        : 225;

    list.push(
      make(
        `quiz_topics_${n}`,
        `Topic Explorer: ${n}`,
        coins,
        "quiz",
        `Completed quizzes across ${n} different topics.`
      )
    );
  }

  // ────────── SUBJECT BREADTH ──────────
  for (const n of [3, 5, 8, 10]) {
    const coins =
      n <= 3
        ? 25
        : n <= 5
        ? 50
        : n <= 8
        ? 90
        : 150;

    list.push(
      make(
        `quiz_subjects_${n}`,
        `Renaissance Learner: ${n} Subjects`,
        coins,
        "quiz",
        `Completed quizzes in ${n} different subject families.`
      )
    );
  }

  list.push(
    make(
      "quiz_multisubject_90_3",
      "Triple Threat",
      60,
      "quiz",
      "Scored 90%+ in three different subject families."
    ),
    make(
      "quiz_multisubject_90_5",
      "Five-Star Scholar",
      120,
      "quiz",
      "Scored 90%+ in five different subject families."
    ),
    make(
      "quiz_perfect_subjects_3",
      "Perfectly Versatile",
      90,
      "quiz",
      "Earned a perfect quiz score in three different subject families."
    ),
    make(
      "quiz_speed_90",
      "Fast & Accurate",
      30,
      "quiz",
      "Scored 90%+ while finishing a quiz in three minutes or less."
    ),
    make(
      "quiz_clutch_80",
      "Clutch Finish",
      30,
      "quiz",
      "Scored 80%+ with 15 seconds or less remaining."
    )
  );

  // ────────── BRAINTEASERS ──────────
  for (const n of [1, 3, 5, 10, 20, 50, 100]) {
    const coins =
      n <= 10
        ? 30
        : n <= 50
        ? 70
        : 150;

    list.push(
      make(
        `brain_pair_${n}`,
        `Brainteaser Pairs: ${n}`,
        coins,
        "brainteasers",
        `Completed ${n} daily brainteaser pairs.`
      )
    );
  }

  // Voice achievements intentionally removed from the visible/claimable app
  // catalog until Nova actually ships a voice-input flow.

  // ────────── SHOP PURCHASES ──────────
  for (const n of [1, 3, 5, 10, 20]) {
    const coins =
      n <= 5
        ? 50
        : n <= 10
        ? 100
        : 200;

    list.push(
      make(
        `purchase_${n}`,
        `Purchases: ${n}`,
        coins,
        "shop",
        `Completed ${n} shop purchases.`
      )
    );
  }

  // ────────── FLASHCARDS ──────────
  for (const n of [1, 5, 10, 25, 50, 100, 200]) {
    const coins =
      n <= 10
        ? 15
        : n <= 50
        ? 40
        : 100;

    list.push(
      make(
        `flashcards_saved_${n}`,
        `Cards Saved: ${n}`,
        coins,
        "flashcards",
        `Saved ${n} flashcards to Collections.`
      )
    );
  }

  // ────────── RELAX TIME ──────────
  for (const mins of [5, 10, 20, 30, 60, 120]) {
    const coins =
      mins <= 10
        ? 20
        : mins <= 30
        ? 40
        : mins <= 60
        ? 80
        : 160;

    list.push(
      make(
        `relax_minutes_${mins}`,
        `Relaxed for ${mins} min`,
        coins,
        "relax",
        `Spent ${mins} total minutes in Relax.`
      )
    );
  }

  const map: Record<string, Achievement> = {};
  for (const achievement of list) {
    map[achievement.id] = achievement;
  }

  return {
    LIST: list,
    MAP: map,
  };
}

const BUILT = buildAchievements();

export const ACHIEVEMENTS = BUILT.MAP;
export const ACHIEVEMENT_LIST = BUILT.LIST;

export const SUBJECT_COLORS: Record<
  SubjectKey,
  {
    bg: string;
    border: string;
    text: string;
  }
> = {
  math: {
    bg: "rgba(0,229,255,0.10)",
    border: "rgba(0,229,255,0.85)",
    text: "#9ff2ff",
  },
  science: {
    bg: "rgba(0,255,153,0.10)",
    border: "rgba(0,255,153,0.85)",
    text: "#9fffcf",
  },
  history: {
    bg: "rgba(255,153,0,0.10)",
    border: "rgba(255,153,0,0.85)",
    text: "#ffd8a6",
  },
  language: {
    bg: "rgba(153,102,255,0.10)",
    border: "rgba(153,102,255,0.85)",
    text: "#dbc8ff",
  },
  computer_science: {
    bg: "rgba(0,190,255,0.10)",
    border: "rgba(0,190,255,0.85)",
    text: "#b8ecff",
  },
  social_science: {
    bg: "rgba(255,120,180,0.10)",
    border: "rgba(255,120,180,0.85)",
    text: "#ffd0e5",
  },
  business: {
    bg: "rgba(255,210,70,0.10)",
    border: "rgba(255,210,70,0.85)",
    text: "#ffe9a0",
  },
  health: {
    bg: "rgba(70,255,180,0.10)",
    border: "rgba(70,255,180,0.85)",
    text: "#baffdf",
  },
  arts_humanities: {
    bg: "rgba(220,120,255,0.10)",
    border: "rgba(220,120,255,0.85)",
    text: "#edc8ff",
  },
  general: {
    bg: "rgba(200,210,220,0.10)",
    border: "rgba(200,210,220,0.70)",
    text: "#e7edf2",
  },
};
