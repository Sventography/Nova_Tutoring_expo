import AsyncStorage from "@react-native-async-storage/async-storage";
import { createCertificate } from "./certificates";
import { showToast } from "./toast";

const CERT_GUARD_KEY = "cert:lastAward.v1";

async function alreadyAwardedRecently(quizTitle: string) {
  try {
    const raw = (await AsyncStorage.getItem(CERT_GUARD_KEY)) || "{}";
    const map = JSON.parse(raw) as Record<string, number>;
    const last = map[quizTitle] || 0;
    const now = Date.now();
    // prevent duplicates if multiple finish paths fire (2 min window)
    if (now - last < 2 * 60 * 1000) return true;
    map[quizTitle] = now;
    await AsyncStorage.setItem(CERT_GUARD_KEY, JSON.stringify(map));
    return false;
  } catch {
    return false;
  }
}

export async function reportQuizFinished(pct: number, subject?: string) {
  const quizTitle = subject || "Quiz";

  // 1) Achievements hook (existing behavior)
  try {
    const mod = require("../context/AchievementsContext");
    const useAchievements = (mod.useAchievements || mod.default?.useAchievements);
    const api = typeof useAchievements === "function" ? useAchievements() : null;
    if (api?.onQuizFinished) await api.onQuizFinished(Math.round(pct), subject);
  } catch {}

  // 2) Certificate for 80%+
  try {
    const score = Math.round(Number(pct) || 0);
    if (score >= 80) {
      const dup = await alreadyAwardedRecently(quizTitle);
      if (!dup) {
        await createCertificate({
          name: "Student",
          quizTitle,
          scorePct: score,
        });
        showToast(`🎓 Certificate earned: ${quizTitle}`);
      }
    }
  } catch {}
}
