// app/state/AskStatsContext.tsx
// Shim for "../state/AskStatsContext" used by header components.
// - If Achievements (or similar) provider exists, we proxy to it.
// - Otherwise we provide safe defaults so UI never breaks.

import React, { createContext, useContext, PropsWithChildren } from "react";

export type AskStats = {
  totalAsks: number;       // total questions asked
  dailyStreak: number;     // consecutive-day streak
  correctRate: number;     // 0..1
  level?: number;          // optional gamified level
  tier?: string;           // optional label (e.g., "Bronze")
};

const DEFAULT_STATS: AskStats = {
  totalAsks: 0,
  dailyStreak: 0,
  correctRate: 0,
  level: 1,
  tier: "New",
};

const Ctx = createContext<AskStats>(DEFAULT_STATS);

/** Try to pull stats from whichever provider exists. */
function readFromProviders(): AskStats | null {
  // 1) AchievementsProvider (most likely)
  try {
    // dynamic require keeps web bundling happy
    const mod = require("../_providers/AchievementsProvider");
    const useAchievements =
      mod?.useAchievements ??
      mod?.useAchievementStats ??
      mod?.useStats ??
      null;
    if (typeof useAchievements === "function") {
      const s = useAchievements();
      // normalize a bunch of likely shapes
      const total =
        s?.totalAsks ??
        s?.askCount ??
        s?.questions?.total ??
        s?.stats?.asks ??
        0;
      const streak =
        s?.streak ??
        s?.dailyStreak ??
        s?.currentStreak ??
        s?.stats?.streak ??
        0;
      const correct =
        s?.correctRate ??
        s?.accuracy ??
        s?.stats?.accuracy ??
        0;
      const level =
        s?.level ??
        s?.stats?.level ??
        1;
      const tier =
        s?.tier ??
        s?.rank ??
        s?.stats?.tier ??
        "Member";
      return {
        totalAsks: Number.isFinite(total) ? total : 0,
        dailyStreak: Number.isFinite(streak) ? streak : 0,
        correctRate: Number.isFinite(correct) ? correct : 0,
        level: Number.isFinite(level) ? level : 1,
        tier: String(tier || "Member"),
      };
    }
  } catch {}

  // 2) Collections/History providers could also expose counts; add more bridges here if needed.

  return null;
}

/** Hook used by components */
export function useAskStats(): AskStats {
  // Prefer a real provider hook if available:
  const proxied = readFromProviders();
  if (proxied) return proxied;

  // Otherwise use the context (which may be DEFAULT_STATS if no Provider was mounted)
  return useContext(Ctx) ?? DEFAULT_STATS;
}

/** Provider: lets you optionally inject explicit stats, otherwise proxies or defaults */
export function AskStatsProvider({
  children,
  value,
}: PropsWithChildren<{ value?: Partial<AskStats> }>) {
  const proxied = readFromProviders();
  const merged: AskStats = {
    ...DEFAULT_STATS,
    ...(proxied ?? {}),
    ...(value ?? {}),
  };
  return <Ctx.Provider value={merged}>{children}</Ctx.Provider>;
}

// Named export for compatibility in case something imports the context object
export const AskStatsContext = Ctx;

// Default export to match various legacy import styles
export default AskStatsContext;
