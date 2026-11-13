import { useAchievements } from "@/context/AchievementsContext";
import { useCallback } from "react";

export function useAchieve() {
  const { unlockAchievement, isUnlocked } = useAchievements();
  return {
    unlock: useCallback((id: string) => unlockAchievement(id), [unlockAchievement]),
    isUnlocked,
  };
}
