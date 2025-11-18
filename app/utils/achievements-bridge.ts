// app/utils/achievements-bridge.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AchieveEmitter,
  ACHIEVEMENT_EVENT,
} from "../context/AchievementsContext";

const STORAGE_KEY = "@nova/achievements.quizFlags.v1";

type QuizFlags = {
  firstQuiz?: boolean;
  score80?: boolean;
  score100?: boolean;
};

async function loadQuizFlags(): Promise<QuizFlags> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as QuizFlags;
  } catch (e) {
    console.warn("[achievements-bridge] loadQuizFlags failed", e);
    return {};
  }
}

async function saveQuizFlags(flags: QuizFlags) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  } catch (e) {
    console.warn("[achievements-bridge] saveQuizFlags failed", e);
  }
}

function unlockAchievement(id: string) {
  if (!id) return;
  console.log("[achievements-bridge] unlocking achievement", id);
  // 🔹 Notify the global emitter — Achievements screen should listen for ACHIEVEMENT_EVENT
  AchieveEmitter.emit(ACHIEVEMENT_EVENT, { id });
}

/**
 * Called when a quiz finishes.
 *
 * - Unlocks: first quiz completion
 * - Unlocks: first quiz with >= 80%
 * - Unlocks: first quiz with 100%
 *
 * It only unlocks each of these **once** per profile.
 */
export async function quizFinished(
  correct: number,
  durationSec: number,
  total: number
) {
  const pct =
    total > 0 ? Math.round((correct / total) * 100) : 0;

  console.log("[achievements-bridge] quizFinished()", {
    correct,
    total,
    pct,
    durationSec,
  });

  const flags = await loadQuizFlags();
  const next: QuizFlags = { ...flags };

  // 🔹 1) First quiz ever finished
  if (!next.firstQuiz) {
    next.firstQuiz = true;
    unlockAchievement("quiz:first-finish");
  }

  // 🔹 2) First quiz with >= 80%
  if (pct >= 80 && !next.score80) {
    next.score80 = true;
    unlockAchievement("quiz:score-80-plus");
  }

  // 🔹 3) First quiz with 100%
  if (pct === 100 && !next.score100) {
    next.score100 = true;
    unlockAchievement("quiz:score-100-perfect");
  }

  await saveQuizFlags(next);
}

/**
 * Optional: debug helper to wipe quiz achievement flags.
 * You can ignore this in production.
 */
export async function resetQuizAchievements() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  console.log("[achievements-bridge] quiz flags reset");
}
