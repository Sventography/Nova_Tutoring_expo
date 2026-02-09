import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AchieveEmitter,
  ACHIEVEMENT_EVENT,
} from "../context/AchievementsContext";

/**
 * Versioned storage (safe to evolve later)
 */
const STORAGE_KEY = "@nova/achievements.v1";

type State = {
  // quiz
  quizTotal: number;
  quiz80: number;
  quiz90: number;
  quiz100: number;
  quizFast: number;
  quiz90Streak: number;
  quizSessionCount: number;
  lastQuizDay?: string;

  // engagement
  quizDayStreak: number;
  lastActiveDay?: string;

  // ask synergy
  askToday: boolean;
  askThenQuizCount: number;

  // flashcards
  cardsToday: boolean;
  cardsThenQuizCount: number;
  flashcardDayStreak: number;
  lastFlashcardDay?: string;
};

const DEFAULT_STATE: State = {
  quizTotal: 0,
  quiz80: 0,
  quiz90: 0,
  quiz100: 0,
  quizFast: 0,
  quiz90Streak: 0,
  quizSessionCount: 0,

  quizDayStreak: 0,

  askToday: false,
  askThenQuizCount: 0,

  cardsToday: false,
  cardsThenQuizCount: 0,
  flashcardDayStreak: 0,
};

const TOTAL_THRESHOLDS = [1, 5, 10, 25, 50, 100, 200, 300, 500];
const COUNT80 = [3, 5, 10, 20, 50];
const COUNT90 = [3, 5, 10, 20];
const COUNT100 = [1, 3, 5, 10, 20];
const FAST = [1, 5, 10];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function load(): Promise<State> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function save(state: State) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function unlock(id: string) {
  AchieveEmitter.emit(ACHIEVEMENT_EVENT, { id });
}

/**
 * Call when Ask is used
 */
export async function askUsed() {
  const s = await load();
  s.askToday = true;
  s.lastActiveDay = todayKey();
  await save(s);
}

/**
 * Call when flashcards are saved/reviewed
 */
export async function flashcardsUsed(countInSession = 1) {
  const s = await load();
  const today = todayKey();

  if (s.lastFlashcardDay !== today) {
    s.flashcardDayStreak =
      s.lastFlashcardDay === prevDay(today) ? s.flashcardDayStreak + 1 : 1;
    s.lastFlashcardDay = today;

    if (s.flashcardDayStreak === 3) unlock("flashcards_day_3");
  }

  if (countInSession >= 10) unlock("flashcards_session_10");

  s.cardsToday = true;
  s.lastActiveDay = today;
  await save(s);
}

/**
 * Call when a quiz finishes
 */
export async function quizFinished(
  correct: number,
  durationSec: number,
  totalQuestions: number
) {
  const pct =
    totalQuestions > 0
      ? Math.round((correct / totalQuestions) * 100)
      : 0;

  const today = todayKey();
  const hour = new Date().getHours();
  const s = await load();

  // ────────── engagement / day tracking ──────────
  if (s.lastQuizDay !== today) {
    s.quizDayStreak =
      s.lastQuizDay === prevDay(today) ? s.quizDayStreak + 1 : 1;

    unlock("quiz_day_1");
    if (s.quizDayStreak === 2) unlock("quiz_days_2");
    if (s.quizDayStreak === 3) unlock("quiz_days_3");
    if (s.quizDayStreak === 5) unlock("quiz_days_5");
  }

  if (s.lastActiveDay && daysBetween(s.lastActiveDay, today) >= 3) {
    unlock("return_after_break");
  }

  s.lastQuizDay = today;
  s.lastActiveDay = today;

  // ────────── quiz totals ──────────
  s.quizTotal += 1;
  if (TOTAL_THRESHOLDS.includes(s.quizTotal)) {
    unlock(`quiz_total_${s.quizTotal}`);
  }

  // ────────── time based ──────────
  if (durationSec <= 60) {
    s.quizFast += 1;
    if (FAST.includes(s.quizFast)) unlock(`quiz_fast_${s.quizFast}`);
  }

  // ────────── score logic ──────────
  if (pct >= 80) {
    s.quiz80 += 1;
    unlock("quiz_score_80");
    if (COUNT80.includes(s.quiz80)) unlock(`quiz_80_count_${s.quiz80}`);
  }

  if (pct >= 90) {
    s.quiz90 += 1;
    s.quiz90Streak += 1;
    unlock("quiz_score_90");
    if (COUNT90.includes(s.quiz90)) unlock(`quiz_90_count_${s.quiz90}`);
    if (s.quiz90Streak === 3) unlock("quiz_streak_90_3");
    if (s.quiz90Streak === 5) unlock("quiz_streak_90_5");
  } else {
    s.quiz90Streak = 0;
  }

  if (pct === 100) {
    s.quiz100 += 1;
    unlock("quiz_score_100");
    if (COUNT100.includes(s.quiz100)) unlock(`quiz_100_count_${s.quiz100}`);
  }

  // ────────── session ──────────
  s.quizSessionCount += 1;
  if (s.quizSessionCount === 5) unlock("quiz_session_5");

  // ────────── time of day ──────────
  if (hour < 8) unlock("quiz_early_bird");
  if (hour >= 22) unlock("quiz_late_night");

  // ────────── Ask synergy ──────────
  if (s.askToday) {
    s.askThenQuizCount += 1;
    unlock("ask_then_quiz_1");
    if (s.askThenQuizCount === 5) unlock("ask_then_quiz_5");
    if (pct >= 80) unlock("ask_then_80");
    s.askToday = false;
  }

  // ────────── Flashcards synergy ──────────
  if (s.cardsToday) {
    s.cardsThenQuizCount += 1;
    unlock("cards_then_quiz_1");
    if (s.cardsThenQuizCount === 5) unlock("cards_then_quiz_5");
    s.cardsToday = false;
  }

  await save(s);
}

/**
 * Helpers
 */
function prevDay(day: string) {
  const d = new Date(day);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.floor((+d2 - +d1) / 86400000);
}

/**
 * Debug helper
 */
export async function resetAchievements() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  console.log("[achievements] reset");
}
