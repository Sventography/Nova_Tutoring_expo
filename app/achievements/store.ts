import { Platform } from "react-native";
import { ALL_ACHIEVEMENTS, RegistryEntry, EvalContext } from "./registry";

const KEY = "achievements:v2";

async function getItem(): Promise<string | null> {
  if (Platform.OS === "web") return Promise.resolve(window.localStorage.getItem(KEY));
  const AS = (await import("@react-native-async-storage/async-storage")).default;
  return AS.getItem(KEY);
}
async function setItem(v: string) {
  if (Platform.OS === "web") { window.localStorage.setItem(KEY, v); return; }
  const AS = (await import("@react-native-async-storage/async-storage")).default;
  await AS.setItem(KEY, v);
}

export async function readUnlocked(): Promise<Set<string>> {
  try { return new Set(JSON.parse((await getItem()) || "[]")); }
  catch { return new Set(); }
}
export async function writeUnlocked(ids: Set<string>) {
  await setItem(JSON.stringify([...ids]));
}

export async function evaluateAndUnlock(ctx: EvalContext) {
  const unlocked = await readUnlocked();
  const newly: RegistryEntry[] = [];
  for (const a of ALL_ACHIEVEMENTS) {
    if (!unlocked.has(a.id) && a.rule(ctx)) {
      unlocked.add(a.id);
      newly.push(a);
    }
  }
  if (newly.length) await writeUnlocked(unlocked);
  return { unlockedIds: unlocked, newly };
}
