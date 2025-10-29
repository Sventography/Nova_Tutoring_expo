import React, { useContext } from "react";
import { useAchievements } from "./AchievementsContext";

const AchievementsEngineContext = React.createContext<any>(null);

export function AchievementsEngineProvider({ children }: { children: React.ReactNode }) {
  const ach = useAchievements();

  function track(event: string) {
    let { counters, streaks, unlock } = ach;

    // ---- Brain Teasers ----
    if (event === "teaser_correct_day") {
      const today = (streaks.teaserDay || 0) + 1;
      streaks = { ...streaks, teaserDay: today };
    }

    if (event === "teaser_streak") {
      const streak = (streaks.teaserStreak || 0) + 1;
      streaks = { ...streaks, teaserStreak: streak };
      if (streak >= 7) unlock("teaser_streak_7");
    }

    if (event === "teaser_correct_total") {
      const total = (counters.teaserTotal || 0) + 1;
      counters = { ...counters, teaserTotal: total };
      if (total >= 50) unlock("teaser_total_50");
    }

    ach.counters = counters;
    ach.streaks = streaks;
  }

  return (
    <AchievementsEngineContext.Provider value={{ ...ach, track }}>
      {children}
    </AchievementsEngineContext.Provider>
  );
}

export function useAchievementsEngine() {
  return useContext(AchievementsEngineContext);
}
