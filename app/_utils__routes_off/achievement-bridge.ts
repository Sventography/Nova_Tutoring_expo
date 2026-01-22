import { useAchievements } from "../context/AchievementsContext";

export function useAchievementBridge() {
  const A = useAchievements();
  return {
    recordAsk: () => A.incAsk(),
    recordVoice: () => A.incVoice(),
    recordQuiz: (scorePct: number, subject?: string) => A.onQuizFinished(scorePct, subject),
    recordBrainteasersPair: (bothCorrect: boolean) => A.onBrainsPair(bothCorrect),
    recordFirstPurchase: () => A.onPurchase(),
    unlock: (id: string) => A.unlock(id),
  };
}
