import { DeviceEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { ACHIEVEMENTS, AchievementDef } from "../constants/achievements";
const STORAGE_UNLOCKED = "@achievements/unlocked";
const STORAGE_POINTS = "@achievements/points";
const STORAGE_COUNTERS = "@achievements/counters";
const STORAGE_WEEK_SEEN = "@achievements/week_seen";
type Counters = Record<string, number>;
type UnlockedSet = Record<string, true>;
const get = async <T>(k: string, fallback: T): Promise<T> => {
  const v = await AsyncStorage.getItem(k);
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
};
const set = (k: string, v: any) => AsyncStorage.setItem(k, JSON.stringify(v));
const inc = (c: Counters, key: string, by = 1) => (c[key] = (c[key] ?? 0) + by);
const now = () => new Date();
const inWindow = (h: number, start: number, end: number) =>
  h >= start && h < end;
export const onUnlocked = (fn: (a: AchievementDef) => void) =>
  DeviceEventEmitter.addListener("achievement_unlocked", fn);
const difficultyToPoints = (a: AchievementDef) => a.points;
async function ensureWeekCounter() {
  const d = now();
  const firstJan = new Date(d.getFullYear(), 0, 1);
  const w = Math.ceil(
    (((d as any) - (firstJan as any)) / 86400000 + firstJan.getDay() + 1) / 7,
  );
  const stamp = `${d.getFullYear()}-W${w}`;
  const last = await AsyncStorage.getItem(STORAGE_WEEK_SEEN);
  if (last !== stamp) {
    await AsyncStorage.setItem(STORAGE_WEEK_SEEN, stamp);
    const counters = await get<Counters>(STORAGE_COUNTERS, {});
    inc(counters, "weeks_active", 1);
    await set(STORAGE_COUNTERS, counters);
  }
}
export async function loadUnlocked(): Promise<string[]> {
  return get<string[]>(STORAGE_UNLOCKED, []);
}
export async function loadPoints(): Promise<number> {
  return get<number>(STORAGE_POINTS, 0);
}
export async function loadCounters(): Promise<Counters> {
  return get<Counters>(STORAGE_COUNTERS, {});
}
async function persistUnlock(id: string, pts: number) {
  const unlocked = await loadUnlocked();
  if (!unlocked.includes(id)) {
    unlocked.push(id);
    await set(STORAGE_UNLOCKED, unlocked);
    const total = (await loadPoints()) + pts;
    await set(STORAGE_POINTS, total);
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) {
      DeviceEventEmitter.emit("achievement_unlocked", a);
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch {}
    }
    if (unlocked.length >= 50) {
      const meta = ACHIEVEMENTS.find((x) => x.id === "all_star_50");
      if (meta) await persistUnlock(meta.id, meta.points);
    }
  }
}
function matches(
  a: AchievementDef,
  counters: Counters,
  evt?: { name?: string; meta?: string },
) {
  const c = a.condition as any;
  if (c.type === "counter") {
    return (counters[c.key] ?? 0) >= c.target;
  } else {
    if (!evt) return false;
    if (c.name === "night_owl" || c.name === "early_bird") {
      const h = now().getHours();
      if (c.name === "night_owl") return inWindow(h, 2, 4);
      if (c.name === "early_bird") return inWindow(h, 5, 6);
    }
    if (c.name === "secret_tap") return evt.name === "secret_tap";
    if (c.name === "all_star_50") return false;
    return evt.name === c.name;
  }
}
async function evaluateAll(evt?: { name?: string; meta?: string }) {
  const unlocked = await loadUnlocked();
  const unlockedSet: UnlockedSet = Object.fromEntries(
    unlocked.map((id) => [id, true]),
  );
  const counters = await loadCounters();
  for (const a of ACHIEVEMENTS) {
    if (!unlockedSet[a.id] && matches(a, counters, evt)) {
      await persistUnlock(a.id, difficultyToPoints(a));
    }
  }
}
export type RecordEventName =
  | "ask_question"
  | "quiz_completed"
  | "perfect_quiz"
  | "voice_used"
  | "streak_day"
  | "flashcard_created"
  | "flashcards_reviewed"
  | "shop_purchased"
  | "theme_equipped"
  | "topic_mastered"
  | "score80_session"
  | "history_open"
  | "coins_spent"
  | "breathing_session"
  | "grounding_session"
  | "first_login"
  | "first_quiz"
  | "first_shop_open"
  | "first_theme_equip"
  | "first_voice_input"
  | "first_flashcard"
  | "first_history_open"
  | "supporter_donate"
  | "bug_report"
  | "share_app"
  | "rate_app"
  | "equip_legendary_theme"
  | "cursor_equip"
  | "relax_room_open"
  | "secret_tap"
  | "heartbeat";
const COUNTER_MAP: Partial<
  Record<RecordEventName, { key: string; incr?: (n: number) => number }>
> = {
  ask_question: { key: "ask_questions" },
  quiz_completed: { key: "quizzes_completed" },
  perfect_quiz: { key: "perfect_quizzes" },
  voice_used: { key: "voice_uses" },
  streak_day: { key: "streak_days" },
  flashcard_created: { key: "flashcards_created" },
  flashcards_reviewed: { key: "flashcards_reviewed" },
  shop_purchased: { key: "shop_purchases" },
  theme_equipped: { key: "themes_equipped" },
  topic_mastered: { key: "topics_mastered" },
  score80_session: { key: "score80_sessions" },
  history_open: { key: "history_views" },
  coins_spent: { key: "coins_spent", incr: (n) => n },
  breathing_session: { key: "breathing_sessions" },
  grounding_session: { key: "grounding_sessions" },
};
export async function recordEvent(
  name: RecordEventName,
  payload?: number | { meta?: string; amount?: number },
) {
  await ensureWeekCounter();
  const counters = await get<Counters>(STORAGE_COUNTERS, {});
  const map = COUNTER_MAP[name as keyof typeof COUNTER_MAP];
  if (map) {
    const amount =
      typeof payload === "number"
        ? payload
        : typeof payload === "object" && payload?.amount
          ? payload.amount
          : 1;
    const by = map.incr ? map.incr(amount) : amount;
    counters[map.key] = (counters[map.key] ?? 0) + by;
    await set(STORAGE_COUNTERS, counters);
  }
  let evt: { name?: string; meta?: string } | undefined = undefined;
  if (name === "quiz_completed" && (counters["quizzes_completed"] ?? 0) === 1)
    evt = { name: "first_quiz" };
  if (name === "theme_equipped" && (counters["themes_equipped"] ?? 0) === 1)
    evt = { name: "first_theme_equip" };
  if (name === "voice_used" && (counters["voice_uses"] ?? 0) === 1)
    evt = { name: "first_voice_input" };
  if (
    name === "flashcard_created" &&
    (counters["flashcards_created"] ?? 0) === 1
  )
    evt = { name: "first_flashcard" };
  if (name === "history_open" && (counters["history_views"] ?? 0) === 1)
    evt = { name: "first_history_open" };
  if (!evt) {
    if (name === "heartbeat") evt = { name: undefined };
    else if (typeof name === "string") evt = { name };
  }
  await evaluateAll(evt);
}
export async function awardForQuizResult(score: number, total: number) {
  await recordEvent("quiz_completed");
  const pct = total > 0 ? (score / total) * 100 : 0;
  if (pct >= 100) await recordEvent("perfect_quiz");
  if (pct >= 80) await recordEvent("score80_session");
  await evaluateAll();
}
export async function awardAskQuestion() {
  await recordEvent("ask_question");
}
export async function awardVoiceUsed() {
  await recordEvent("voice_used");
}
export async function awardFlashcardCreated() {
  await recordEvent("flashcard_created");
}
export async function awardFlashcardsReviewed(n: number) {
  await recordEvent("flashcards_reviewed", n);
}
export async function awardShopPurchase() {
  await recordEvent("shop_purchased");
}
export async function awardThemeEquipped(isLegendary?: boolean) {
  await recordEvent("theme_equipped");
  if (isLegendary) await recordEvent("equip_legendary_theme");
}
export async function awardHistoryOpen() {
  await recordEvent("history_open");
}
export async function awardRelaxOpened() {
  await recordEvent("relax_room_open");
}
export async function awardBreathingSession() {
  await recordEvent("breathing_session");
}
export async function awardGroundingSession() {
  await recordEvent("grounding_session");
}
export async function awardCoinsSpent(amount: number) {
  await recordEvent("coins_spent", { amount });
}
export async function awardTopicMastered() {
  await recordEvent("topic_mastered");
}
export async function awardSupporterDonate() {
  await recordEvent("supporter_donate");
}
export async function awardBugReport() {
  await recordEvent("bug_report");
}
export async function awardShareApp() {
  await recordEvent("share_app");
}
export async function awardRateApp() {
  await recordEvent("rate_app");
}
export async function fireSecretTap() {
  await recordEvent("secret_tap");
}
export async function getProgressSummary() {
  const [ids, points, counters] = await Promise.all([
    loadUnlocked(),
    loadPoints(),
    loadCounters(),
  ]);
  return { unlockedCount: ids.length, totalPoints: points, counters };
}
