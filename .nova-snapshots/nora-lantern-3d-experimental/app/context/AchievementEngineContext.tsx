import React from "react";

type API = { track: (key: string) => void };
export const AchievementEngine = React.createContext<API>({ track: () => {} });

export default function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const track = (key: string) => { try { console.log("[achv-engine] track", key); } catch {} };
  return <AchievementEngine.Provider value={{ track }}>{children}</AchievementEngine.Provider>;
}

export const useAchievementsEngine = () => React.useContext(AchievementEngine);
