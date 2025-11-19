import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AchieveEmitter,
  ACHIEVEMENT_EVENT,
} from "../context/AchievementsContext";
import { subjectKey } from "../constants/achievements";

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
  // 🔹 Notify the global emitter — Achievements screen + coins bridge listen here
  AchieveEmitter.emit(ACHIEVEMENT_EVENT, { id });
}

/**
 * Called when a quiz finishes.
 *
 * - Unlocks: first quiz completed (maps to quiz_taken_1)
 * - Unlocks: first quiz with >= 80% (maps to quiz_80)
 * - Unlocks: first quiz with 100% (maps to quiz_100)
 *
 * It only unlocks each of these **once** per profile.
 */
export async function quizFinished(
  correct: number,
  durationSec: number,
  total: number,
  subjectRaw?: string
) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const subject = subjectKey(subjectRaw); // "math", "science", etc. if you want later

  console.log("[achievements-bridge] quizFinished()", {
    correct,
    total,
    pct,
    durationSec,
    subject,
  });

  const flags = await loadQuizFlags();
  const next: QuizFlags = { ...flags };

  // 🔹 1) First quiz ever finished -> use existing global achievement id
  if (!next.firstQuiz) {
    next.firstQuiz = true;
    unlockAchievement("quiz_taken_1");
  }

  // 🔹 2) First quiz with >= 80% -> global performance achievement
  if (pct >= 80 && !next.score80) {
    next.score80 = true;
    unlockAchievement("quiz_80");
  }

  // 🔹 3) First quiz with 100% -> global perfect score achievement
  if (pct === 100 && !next.score100) {
    next.score100 = true;
    unlockAchievement("quiz_100");
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
