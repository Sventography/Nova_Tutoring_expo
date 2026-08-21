// app/_lib/quizAchievementProgress.ts
//
// Variety/subject achievement progress.
// Phase 3D foundation: signed-in reward CLAIMS remain server-idempotent via
// AchievementsContext, while these counters are kept locally for now.
// A later Phase 3D server-counter migration can move this exact state shape
// behind an RPC without changing achievement IDs.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SUBJECT_KEYS,
  normalizeSubjectKey,
  type SubjectKey,
} from "./topicTaxonomy";

export type QuizAchievementMeta = {
  topicId?: string;
  title?: string;
  discipline?: string;
  correct?: number;
  total?: number;
  durationSec?: number;
  remainingSeconds?: number;
};

type ProgressState = {
  version: 1;
  subjectCounts: Record<string, number>;
  subjectBestPct: Record<string, number>;
  correctTotal: number;
  perfectTotal: number;
  topicIds: string[];
  subjectIds: string[];
  perfectSubjectIds: string[];
};

type RecordArgs = {
  ownerId?: string | null;
  pct: number;
  subject: string;
  meta?: QuizAchievementMeta;
  unlock: (id: string) => void;
};

const BASE_KEY = "@nova/achievements.quizVariety.v1";
const queues = new Map<string, Promise<void>>();

const SUBJECT_TAKEN_THRESHOLDS = [1, 5, 10, 25, 50, 100, 200];
const SUBJECT_SCORE_THRESHOLDS = [80, 85, 90, 95, 100];
const CORRECT_THRESHOLDS = [25, 100, 250, 500, 1000, 2500];
const PERFECT_THRESHOLDS = [3, 5, 10, 25, 50];
const TOPIC_THRESHOLDS = [3, 5, 10, 25, 50, 100];
const SUBJECT_BREADTH_THRESHOLDS = [3, 5, 8, 10];

function keyFor(ownerId?: string | null): string {
  const owner = String(ownerId || "guest").trim() || "guest";
  return `${BASE_KEY}:${owner}`;
}

function emptyState(): ProgressState {
  return {
    version: 1,
    subjectCounts: {},
    subjectBestPct: {},
    correctTotal: 0,
    perfectTotal: 0,
    topicIds: [],
    subjectIds: [],
    perfectSubjectIds: [],
  };
}

function safeInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function uniq(values: readonly string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((v) => String(v || "").trim())
        .filter(Boolean)
    )
  );
}

async function load(key: string): Promise<ProgressState> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return emptyState();

    const parsed = JSON.parse(raw) as Partial<ProgressState>;

    return {
      version: 1,
      subjectCounts:
        parsed.subjectCounts && typeof parsed.subjectCounts === "object"
          ? parsed.subjectCounts
          : {},
      subjectBestPct:
        parsed.subjectBestPct && typeof parsed.subjectBestPct === "object"
          ? parsed.subjectBestPct
          : {},
      correctTotal: safeInt(parsed.correctTotal),
      perfectTotal: safeInt(parsed.perfectTotal),
      topicIds: uniq(
        Array.isArray(parsed.topicIds)
          ? parsed.topicIds
          : []
      ),
      subjectIds: uniq(
        Array.isArray(parsed.subjectIds)
          ? parsed.subjectIds
          : []
      ),
      perfectSubjectIds: uniq(
        Array.isArray(parsed.perfectSubjectIds)
          ? parsed.perfectSubjectIds
          : []
      ),
    };
  } catch (error) {
    console.warn(
      "[Achievements] quiz variety progress load failed",
      error
    );
    return emptyState();
  }
}

function unlockThresholds(
  total: number,
  thresholds: readonly number[],
  makeId: (threshold: number) => string,
  unlock: (id: string) => void
) {
  for (const threshold of thresholds) {
    if (total >= threshold) {
      unlock(makeId(threshold));
    }
  }
}

async function recordInternal(args: RecordArgs): Promise<void> {
  const storageKey = keyFor(args.ownerId);
  const state = await load(storageKey);

  const pct = Math.max(
    0,
    Math.min(100, safeInt(args.pct))
  );

  const subject: SubjectKey =
    normalizeSubjectKey(args.subject);

  const meta = args.meta ?? {};
  const correct = safeInt(meta.correct);
  const totalQuestions = safeInt(meta.total);
  const topicId = String(
    meta.topicId || meta.title || ""
  ).trim();

  state.subjectCounts[subject] =
    safeInt(state.subjectCounts[subject]) + 1;

  state.subjectBestPct[subject] = Math.max(
    safeInt(state.subjectBestPct[subject]),
    pct
  );

  state.correctTotal += Math.min(
    correct,
    totalQuestions || correct
  );

  if (pct === 100) {
    state.perfectTotal += 1;
    state.perfectSubjectIds = uniq([
      ...state.perfectSubjectIds,
      subject,
    ]);
  }

  if (topicId) {
    state.topicIds = uniq([
      ...state.topicIds,
      topicId,
    ]);
  }

  state.subjectIds = uniq([
    ...state.subjectIds,
    subject,
  ]);

  // Reserve progress before claims. If a network-backed claim fails,
  // AchievementsContext already keeps a pending server-claim queue.
  await AsyncStorage.setItem(
    storageKey,
    JSON.stringify(state)
  );

  // Existing per-subject achievements now have real counters.
  unlockThresholds(
    state.subjectCounts[subject],
    SUBJECT_TAKEN_THRESHOLDS,
    (n) => `quiz_taken_${subject}_${n}`,
    args.unlock
  );

  for (const score of SUBJECT_SCORE_THRESHOLDS) {
    if (pct >= score) {
      args.unlock(`quiz_${subject}_${score}`);
    }
  }

  // New achievement variety.
  unlockThresholds(
    state.correctTotal,
    CORRECT_THRESHOLDS,
    (n) => `quiz_correct_${n}`,
    args.unlock
  );

  unlockThresholds(
    state.perfectTotal,
    PERFECT_THRESHOLDS,
    (n) => `quiz_perfect_${n}`,
    args.unlock
  );

  unlockThresholds(
    state.topicIds.length,
    TOPIC_THRESHOLDS,
    (n) => `quiz_topics_${n}`,
    args.unlock
  );

  unlockThresholds(
    state.subjectIds.length,
    SUBJECT_BREADTH_THRESHOLDS,
    (n) => `quiz_subjects_${n}`,
    args.unlock
  );

  const subjectsAt90 = SUBJECT_KEYS.filter(
    (key) =>
      safeInt(state.subjectBestPct[key]) >= 90
  ).length;

  if (subjectsAt90 >= 3) {
    args.unlock("quiz_multisubject_90_3");
  }

  if (subjectsAt90 >= 5) {
    args.unlock("quiz_multisubject_90_5");
  }

  if (state.perfectSubjectIds.length >= 3) {
    args.unlock("quiz_perfect_subjects_3");
  }

  const durationSec = safeInt(meta.durationSec);
  if (
    pct >= 90 &&
    durationSec > 0 &&
    durationSec <= 180
  ) {
    args.unlock("quiz_speed_90");
  }

  const remaining = safeInt(
    meta.remainingSeconds
  );

  if (
    pct >= 80 &&
    remaining <= 15
  ) {
    args.unlock("quiz_clutch_80");
  }
}

export function recordQuizAchievementProgress(
  args: RecordArgs
): Promise<void> {
  const key = keyFor(args.ownerId);
  const previous =
    queues.get(key) ?? Promise.resolve();

  const run = previous
    .catch(() => {})
    .then(() => recordInternal(args));

  queues.set(
    key,
    run.catch((error) => {
      console.warn(
        "[Achievements] quiz variety progress update failed",
        error
      );
    })
  );

  return run;
}
