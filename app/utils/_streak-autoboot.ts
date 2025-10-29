import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

const DAYS_KEYS = ["@streak/days", "streak_days", "@streakDays"];
const LAST_KEYS = ["@streak/last", "streak_last", "@streakLastISO"];

function nyDateISO(d: Date = new Date()): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
    const parts = Object.fromEntries(fmt.formatToParts(d).map(p=>[p.type,p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    const z = d.getTime() - d.getTimezoneOffset() * 60000;
    return new Date(z).toISOString().slice(0,10);
  }
}

function isYesterdayNY(prevISO: string, todayISO: string): boolean {
  const toDate = (iso: string) => {
    const [y,m,da] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m-1, da));
  };
  const prev = toDate(prevISO), today = toDate(todayISO);
  const diff = (today.getTime() - prev.getTime()) / 86400000;
  return diff >= 1 && diff < 2;
}

async function readFirst(keys: string[]): Promise<string | null> {
  for (const k of keys) {
    const v = await AsyncStorage.getItem(k);
    if (v != null) return v;
  }
  return null;
}
async function writeAll(keys: string[], value: string) {
  await Promise.all(keys.map(k => AsyncStorage.setItem(k, value)));
}

export async function streakAutoboot() {
  const today = nyDateISO();
  const rawDays = await readFirst(DAYS_KEYS);
  const rawLast = await readFirst(LAST_KEYS);

  let days = Math.max(1, Number(rawDays || 0) || 0);
  let last = rawLast || "";

  if (!last) {
    last = today;
    days = Math.max(days, 1);
  } else if (last === today) {
  } else if (isYesterdayNY(last, today)) {
    days = Math.max(1, days + 1);
    last = today;
  } else {
    days = 1;
    last = today;
  }

  await writeAll(DAYS_KEYS, String(days));
  await writeAll(LAST_KEYS, last);

  try { DeviceEventEmitter.emit("streak:update", { days, today: last === today }); } catch {}
  return { days, last };
}

/* auto-run for side effects */
streakAutoboot().catch(()=>{});
