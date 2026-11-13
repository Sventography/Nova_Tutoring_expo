import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "streak:data";

type Streak = { count: number; last: string };

async function read(): Promise<Streak | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Streak) : null;
}

async function write(s: Streak) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

function daysBetween(a: Date, b: Date) {
  const ms =
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) -
    Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round(ms / 86400000);
}

export async function touchStreak(date: Date = new Date()): Promise<Streak> {
  const now = date;
  const curr = await read();
  if (!curr) {
    const s = { count: 1, last: now.toISOString() };
    await write(s);
    return s;
  }
  const last = new Date(curr.last);
  const diff = daysBetween(now, last);
  if (diff <= 0) return curr;
  const nextCount = diff === 1 ? curr.count + 1 : 1;
  const s = { count: nextCount, last: now.toISOString() };
  await write(s);
  return s;
}

export async function getStreak(): Promise<number> {
  const s = await read();
  return s ? s.count : 0;
}

export function awardLoginPoints(streak: number): number {
  if (streak >= 30) return 200;
  if (streak >= 7) return 80;
  if (streak >= 3) return 30;
  return 10;
}
