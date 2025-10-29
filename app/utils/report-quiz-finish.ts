export async function reportQuizFinished(pct: number, subject?: string) {
  try {
    const mod = require("../context/AchievementsContext");
    const useAchievements = (mod.useAchievements || mod.default?.useAchievements);
    const api = typeof useAchievements === "function" ? useAchievements() : null;
    if (api?.onQuizFinished) await api.onQuizFinished(Math.round(pct), subject);
  } catch {}
}
