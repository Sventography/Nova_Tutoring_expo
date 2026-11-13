// app/lib/achievements.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Achievement = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  earnedAt?: number;
};

const KEY = "achievements_v1";

export async function listAchievements(): Promise<Achievement[]> {
  const raw = (await AsyncStorage.getItem(KEY)) || "[]";
  const arr: Achievement[] = JSON.parse(raw);
  return arr.sort((a, b) => (b.earnedAt || 0) - (a.earnedAt || 0));
}

export async function hasAchievement(id: string): Promise<boolean> {
  const raw = (await AsyncStorage.getItem(KEY)) || "[]";
  const arr: Achievement[] = JSON.parse(raw);
  return arr.some((a) => a.id === id);
}

export async function grantAchievement(a: Achievement | string): Promise<boolean> {
  const raw = (await AsyncStorage.getItem(KEY)) || "[]";
  const arr: Achievement[] = JSON.parse(raw);

  const id = typeof a === "string" ? a : a.id;
  if (arr.some((x) => x.id === id)) return false; // already earned

  const obj: Achievement =
    typeof a === "string"
      ? { id, title: id, earnedAt: Date.now() }
      : { ...a, earnedAt: a.earnedAt ?? Date.now() };

  arr.unshift(obj);
  await AsyncStorage.setItem(KEY, JSON.stringify(arr.slice(0, 200)));
  return true;
}

export async function clearAchievements(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

