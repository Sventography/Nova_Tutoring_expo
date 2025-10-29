// app/lib/progress.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ACHIEVEMENTS } from "../constants/achievements";

const KEY = "NT_PROGRESS_V4"; // bump for inventory + equip

export type TopicResult = {
  highestScore: number;
  fastestTimeSec: number | null;
  lastTakenAt: string | null;
};

export type ProgressState = {
  // quiz stats
  quizzesTaken: number;
  totalCorrect: number;
  totalQuestions: number;
  perfectQuizzes: number;
  distinctTopics: string[];
  perTopic: Record<string, TopicResult>;
  fastestOverallSec: number | null;

  // streaks
  streak: { current: number; best: number; lastCheckInISO: string | null };
  quizDayStreak: {
    current: number;
    best: number;
    lastQuizDayISO: string | null;
  };

  // achievements
  achievementsUnlocked: string[];

  // economy & inventory
  coins: number;
  owned: Record<string, number>; // tangible: quantity; intangible: 1 or 0
  equippedThemeId: string | null; // currently active theme

  // purchase ledger (cash or coins) for your own reporting if needed
  ledger: {
    id: string; // itemId
    ts: string; // ISO
    kind: "coins" | "cash";
    qty: number;
    amountCoins?: number;
    amountUSD?: number;
  }[];
};

const defaultState: ProgressState = {
  quizzesTaken: 0,
  totalCorrect: 0,
  totalQuestions: 0,
  perfectQuizzes: 0,
  distinctTopics: [],
  perTopic: {},
  fastestOverallSec: null,

  streak: { current: 0, best: 0, lastCheckInISO: null },
  quizDayStreak: { current: 0, best: 0, lastQuizDayISO: null },

  achievementsUnlocked: [],

  coins: 50,
  owned: {},
  equippedThemeId: null,
  ledger: [],
};

// ---------- storage ----------
export async function getProgress(): Promise<ProgressState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { ...defaultState };
  try {
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return { ...defaultState };
  }
}
async function saveProgress(p: ProgressState) {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}

// ---------- tiny date helpers ----------
function isSameDayISO(a: string, b: string) {
  const A = new Date(a),
    B = new Date(b);
  return (
    A.getFullYear() === B.getFullYear() &&
    A.getMonth() === B.getMonth() &&
    A.getDate() === B.getDate()
  );
}
function dayDiffUTC(aISO: string, bISO: string) {
  const a = new Date(aISO),
    b = new Date(bISO);
  const aUTC = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUTC = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((aUTC - bUTC) / (1000 * 60 * 60 * 24));
}

// ---------- achievements helpers ----------
function unlock(p: ProgressState, id: string, newly: string[]) {
  if (
    !p.achievementsUnlocked.includes(id) &&
    ACHIEVEMENTS.find((a) => a.id === id)
  ) {
    p.achievementsUnlocked.push(id);
    newly.push(id);
  }
}
function countPerfectTopics(p: ProgressState) {
  return Object.values(p.perTopic).filter((t) => t.highestScore >= 20).length;
}

function reevaluateAchievements(
  p: ProgressState,
  context?: {
    justCheckedInISO?: string;
    quizDelta?: {
      score: number;
      total: number;
      durationSec: number;
      topicId: string;
      wasPBScore: boolean;
      wasPBSpeed: boolean;
    };
  },
) {
  const newly: string[] = [];
  // streaks
  if (p.streak.current >= 1) unlock(p, "streak_1", newly);
  if (p.streak.current >= 3) unlock(p, "streak_3", newly);
  if (p.streak.current >= 5) unlock(p, "streak_5", newly);
  if (p.streak.current >= 7) unlock(p, "streak_7", newly);
  if (p.streak.current >= 10) unlock(p, "streak_10", newly);
  if (p.streak.current >= 14) unlock(p, "streak_14", newly);
  if (p.streak.current >= 21) unlock(p, "streak_21", newly);
  if (p.streak.current >= 30) unlock(p, "streak_30", newly);
  if (p.streak.current >= 50) unlock(p, "streak_50", newly);
  if (p.streak.current >= 75) unlock(p, "streak_75", newly);
  if (p.streak.current >= 100) unlock(p, "streak_100", newly);

  // time-of-day check-in
  if (context?.justCheckedInISO) {
    const h = new Date(context.justCheckedInISO).getHours();
    if (h < 9) unlock(p, "check_morning", newly);
    if (h >= 21) unlock(p, "check_night", newly);
    unlock(p, "first_check", newly);
  }

  // quizzes count
  const q = p.quizzesTaken;
  if (q >= 1) unlock(p, "quiz_1", newly);
  if (q >= 5) unlock(p, "quiz_5", newly);
  if (q >= 10) unlock(p, "quiz_10", newly);
  if (q >= 20) unlock(p, "quiz_20", newly);
  if (q >= 30) unlock(p, "quiz_30", newly);
  if (q >= 50) unlock(p, "quiz_50", newly);
  if (q >= 75) unlock(p, "quiz_75", newly);
  if (q >= 100) unlock(p, "quiz_100", newly);
  if (q >= 150) unlock(p, "quiz_150", newly);
  if (q >= 200) unlock(p, "quiz_200", newly);

  // distinct topics
  const d = p.distinctTopics.length;
  if (d >= 3) unlock(p, "topics_3", newly);
  if (d >= 5) unlock(p, "topics_5", newly);
  if (d >= 10) unlock(p, "topics_10", newly);
  if (d >= 15) unlock(p, "topics_15", newly);
  if (d >= 20) unlock(p, "topics_20", newly);
  if (d >= 30) unlock(p, "topics_30", newly);
  if (d >= 40) unlock(p, "topics_40", newly);
  if (d >= 50) unlock(p, "topics_50", newly);

  // perfects
  if (p.perfectQuizzes >= 1) unlock(p, "perfect_1", newly);
  if (p.perfectQuizzes >= 3) unlock(p, "perfect_3", newly);
  if (p.perfectQuizzes >= 5) unlock(p, "perfect_5", newly);
  if (p.perfectQuizzes >= 10) unlock(p, "perfect_10", newly);
  if (p.perfectQuizzes >= 20) unlock(p, "perfect_20", newly);

  // mastery
  const mastered = countPerfectTopics(p);
  if (mastered >= 3) unlock(p, "master_3", newly);
  if (mastered >= 5) unlock(p, "master_5", newly);
  if (mastered >= 10) unlock(p, "master_10", newly);
  if (mastered >= 20) unlock(p, "master_20", newly);

  // cumulative correct
  const cc = p.totalCorrect;
  if (cc >= 50) unlock(p, "correct_50", newly);
  if (cc >= 100) unlock(p, "correct_100", newly);
  if (cc >= 250) unlock(p, "correct_250", newly);
  if (cc >= 500) unlock(p, "correct_500", newly);
  if (cc >= 750) unlock(p, "correct_750", newly);
  if (cc >= 1000) unlock(p, "correct_1000", newly);
  if (cc >= 1500) unlock(p, "correct_1500", newly);
  if (cc >= 2000) unlock(p, "correct_2000", newly);

  // average
  const avg = p.totalQuestions > 0 ? p.totalCorrect / p.totalQuestions : 0;
  if (p.quizzesTaken >= 10 && avg >= 0.7) unlock(p, "avg_70", newly);
  if (p.quizzesTaken >= 15 && avg >= 0.8) unlock(p, "avg_80", newly);
  if (p.quizzesTaken >= 20 && avg >= 0.9) unlock(p, "avg_90", newly);

  // speed & PB
  if (context?.quizDelta) {
    const dSec = context.quizDelta.durationSec;
    if (dSec < 120) unlock(p, "speed_120", newly);
    if (dSec < 90) unlock(p, "speed_90", newly);
    if (dSec < 60) unlock(p, "speed_60", newly);
    if (dSec < 45) unlock(p, "speed_45", newly);
    if (dSec < 30) unlock(p, "speed_30", newly);
    if (context.quizDelta.score >= 15) unlock(p, "score_15", newly);
    if (context.quizDelta.score >= 18) unlock(p, "score_18", newly);
    if (context.quizDelta.score === context.quizDelta.total - 1)
      unlock(p, "score_19", newly);
    if (context.quizDelta.wasPBSpeed) unlock(p, "pb_speed", newly);
    if (context.quizDelta.wasPBScore) unlock(p, "pb_score", newly);
  }

  // quiz-day streak
  const qs = p.quizDayStreak.current;
  if (qs >= 2) unlock(p, "qstreak_2", newly);
  if (qs >= 3) unlock(p, "qstreak_3", newly);
  if (qs >= 5) unlock(p, "qstreak_5", newly);
  if (qs >= 7) unlock(p, "qstreak_7", newly);
  if (qs >= 10) unlock(p, "qstreak_10", newly);
  if (qs >= 14) unlock(p, "qstreak_14", newly);
  if (qs >= 21) unlock(p, "qstreak_21", newly);
  if (qs >= 30) unlock(p, "qstreak_30", newly);

  // grit
  if (p.quizzesTaken >= 10 && p.perfectQuizzes === 0)
    unlock(p, "grit_10", newly);
  if (p.quizzesTaken >= 25 && p.perfectQuizzes === 0)
    unlock(p, "grit_25", newly);

  return newly;
}

// ---------- public API: check-in & quiz ----------
export async function checkInToday() {
  const p = await getProgress();
  const now = new Date().toISOString();

  if (!p.streak.lastCheckInISO) {
    p.streak.current = 1;
  } else if (!isSameDayISO(now, p.streak.lastCheckInISO)) {
    const diff = dayDiffUTC(now, p.streak.lastCheckInISO);
    p.streak.current = diff === 1 ? p.streak.current + 1 : 1;
  }
  p.streak.best = Math.max(p.streak.best, p.streak.current);
  p.streak.lastCheckInISO = now;

  // coins for check-in
  p.coins += 5;

  const newly = reevaluateAchievements(p, { justCheckedInISO: now });
  await saveProgress(p);
  return { progress: p, newlyUnlocked: newly };
}

export async function recordQuizResult(opts: {
  topicId: string;
  correct: number;
  total: number;
  durationSec: number;
}) {
  const p = await getProgress();
  const now = new Date().toISOString();

  p.quizzesTaken += 1;
  p.totalCorrect += opts.correct;
  p.totalQuestions += opts.total;
  if (opts.correct === opts.total) p.perfectQuizzes += 1;

  if (!p.distinctTopics.includes(opts.topicId))
    p.distinctTopics.push(opts.topicId);

  const prev = p.perTopic[opts.topicId] ?? {
    highestScore: 0,
    fastestTimeSec: null,
    lastTakenAt: null,
  };
  const wasPBScore = opts.correct > (prev.highestScore ?? 0);
  const wasPBSpeed =
    prev.fastestTimeSec == null ||
    opts.durationSec < (prev.fastestTimeSec ?? Infinity);

  // return-after-break checks (optional)

  prev.highestScore = Math.max(prev.highestScore, opts.correct);
  prev.fastestTimeSec =
    prev.fastestTimeSec == null
      ? opts.durationSec
      : Math.min(prev.fastestTimeSec, opts.durationSec);
  prev.lastTakenAt = now;
  p.perTopic[opts.topicId] = prev;

  if (p.fastestOverallSec == null || opts.durationSec < p.fastestOverallSec)
    p.fastestOverallSec = opts.durationSec;

  // quiz-per-day streak
  if (!p.quizDayStreak.lastQuizDayISO) {
    p.quizDayStreak.current = 1;
  } else if (!isSameDayISO(now, p.quizDayStreak.lastQuizDayISO)) {
    const diff = dayDiffUTC(now, p.quizDayStreak.lastQuizDayISO);
    p.quizDayStreak.current = diff === 1 ? p.quizDayStreak.current + 1 : 1;
  }
  p.quizDayStreak.best = Math.max(
    p.quizDayStreak.best,
    p.quizDayStreak.current,
  );
  p.quizDayStreak.lastQuizDayISO = now;

  // coins for performance
  p.coins += Math.max(0, opts.correct);

  const newly = reevaluateAchievements(p, {
    quizDelta: {
      score: opts.correct,
      total: opts.total,
      durationSec: opts.durationSec,
      topicId: opts.topicId,
      wasPBScore,
      wasPBSpeed,
    },
  });

  await saveProgress(p);
  return { progress: p, newlyUnlocked: newly };
}

// ---------- coins & inventory ----------
export async function getCoins() {
  return (await getProgress()).coins;
}
export async function awardCoins(amount: number) {
  const p = await getProgress();
  p.coins = Math.max(0, p.coins + amount);
  await saveProgress(p);
  return p;
}

export async function getOwnedQty(itemId: string) {
  const p = await getProgress();
  return p.owned[itemId] ?? 0;
}
export async function adjustItem(itemId: string, deltaQty: number) {
  const p = await getProgress();
  const next = Math.max(0, (p.owned[itemId] ?? 0) + deltaQty);
  if (next === 0) delete p.owned[itemId];
  else p.owned[itemId] = next;
  await saveProgress(p);
  return p;
}

// coins purchase (supports quantity)
export async function purchaseItem(itemId: string, costCoins: number, qty = 1) {
  const p = await getProgress();
  const totalCost = costCoins * Math.max(1, qty);
  if (p.coins < totalCost)
    return {
      ok: false as const,
      reason: "insufficient_funds" as const,
      progress: p,
    };

  p.coins -= totalCost;
  p.owned[itemId] = (p.owned[itemId] ?? 0) + qty;
  p.ledger.push({
    id: itemId,
    ts: new Date().toISOString(),
    kind: "coins",
    qty,
    amountCoins: totalCost,
  });

  await saveProgress(p);
  return { ok: true as const, progress: p };
}

// cash purchase record (quantity allowed)
export async function purchaseCashRecord(itemId: string, usd: number, qty = 1) {
  const p = await getProgress();
  p.owned[itemId] = (p.owned[itemId] ?? 0) + qty;
  p.ledger.push({
    id: itemId,
    ts: new Date().toISOString(),
    kind: "cash",
    qty,
    amountUSD: usd,
  });
  await saveProgress(p);
  return p;
}

// theme equip
export async function equipTheme(themeId: string) {
  const p = await getProgress();
  // require ownership
  if (!p.owned[themeId])
    return { ok: false as const, reason: "not_owned" as const, progress: p };
  p.equippedThemeId = themeId;
  await saveProgress(p);
  return { ok: true as const, progress: p };
}
