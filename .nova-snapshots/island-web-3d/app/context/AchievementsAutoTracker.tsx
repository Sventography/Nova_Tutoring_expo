import React, { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
import { AchieveEmitter } from "./AchievementsContext";

const K = "@achievements/emitted";

async function was(id: string) {
  try { const raw = await AsyncStorage.getItem(K); const m = raw ? JSON.parse(raw) : {}; return !!m[id]; } catch { return false; }
}
async function mark(id: string) {
  try { const raw = await AsyncStorage.getItem(K); const m = raw ? JSON.parse(raw) : {}; m[id] = true; await AsyncStorage.setItem(K, JSON.stringify(m)); } catch {}
}
async function unlock(id: string, toast?: string) {
  if (!id) return;
  if (await was(id)) return;
  try { AchieveEmitter.emit("unlock", { id }); } catch {}
  if (toast) try { AchieveEmitter.emit("celebrate", toast); } catch {}
  await mark(id);
}

export default function AchievementsAutoTracker() {
  useEffect(() => {
    const s1 = DeviceEventEmitter.addListener("quiz:finished", async ({ score = 0, durationSec = 9999 } = {} as any) => {
      if (score >= 80) await unlock("quiz_score_80", "Quiz 80%!");
      if (durationSec <= 120) await unlock("quiz_fast_120", "Fast quiz!");
      if (durationSec <= 60) await unlock("quiz_fast_60", "Speed demon!");
    });
    const s2 = DeviceEventEmitter.addListener("collections:saved", async ({ total = 0 } = {} as any) => {
      if (total >= 10) await unlock("flashcards_saved_10", "Saved 10!");
      if (total >= 50) await unlock("flashcards_saved_50", "Saved 50!");
      if (total >= 100) await unlock("flashcards_saved_100", "Saved 100!");
    });
    const s3 = DeviceEventEmitter.addListener("flashcards:created", async ({ total = 0 } = {} as any) => {
      if (total >= 10) await unlock("flashcards_created_10", "Created 10!");
      if (total >= 50) await unlock("flashcards_created_50", "Created 50!");
    });
    const s4 = DeviceEventEmitter.addListener("streak:update", async ({ days = 0, today = false } = {} as any) => {
      if (today) await unlock("daily_login_1", "Daily login!");
      if (days >= 7) await unlock("streak_7", "7-day streak!");
      if (days >= 30) await unlock("streak_30", "30-day streak!");
    });
    return () => { try { s1.remove(); s2.remove(); s3.remove(); s4.remove(); } catch {} };
  }, []);
  return null;
}
