import { Platform } from "react-native";

/** storage helpers: localStorage on web, AsyncStorage elsewhere */
async function getItem(k: string) {
  if (Platform.OS === "web") return window.localStorage.getItem(k);
  const AS = (await import("@react-native-async-storage/async-storage")).default;
  return AS.getItem(k);
}
async function setItem(k: string, v: string) {
  if (Platform.OS === "web") { window.localStorage.setItem(k, v); return; }
  const AS = (await import("@react-native-async-storage/async-storage")).default;
  await AS.setItem(k, v);
}

const K_LAST = "last_used_day";
const K_STREAK = "streak_days";

/** Normalize to a local "date string" so timezones don't break streaks */
export function todayKey() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
}
function yesterdayKey() {
  const d = new Date();
  const y = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return y.toDateString();
}

/** Call once per app open. Increments if yesterday -> today; resets if gap. */
export async function updateUsageStreak(): Promise<number> {
  const today = todayKey();
  const last = (await getItem(K_LAST)) || null;
  const cur = parseInt((await getItem(K_STREAK)) || "0", 10);

  let next = cur;

  if (last === today) {
    // already counted today
    return cur || 1; // ensure at least 1 if we have a "today" mark
  }

  if (last === yesterdayKey()) {
    next = cur + 1 || 1; // continue streak
  } else {
    next = 1; // reset/new streak
  }

  await setItem(K_LAST, today);
  await setItem(K_STREAK, String(next));
  return next;
}

export async function getStreakDays(): Promise<number> {
  const v = parseInt((await getItem(K_STREAK)) || "0", 10);
  return Number.isFinite(v) && v > 0 ? v : 0;
}
