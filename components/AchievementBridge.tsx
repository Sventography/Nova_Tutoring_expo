import React, { createContext, useContext, PropsWithChildren } from "react";
import useAchievementToast, { ToastOpts } from "./AchievementToast";

type Ctx = { show: (o: ToastOpts) => void };
const AchievementToastContext = createContext<Ctx | null>(null);

export function useAchievementToaster() {
  const ctx = useContext(AchievementToastContext);
  if (!ctx) {
    throw new Error("AchievementBridge missing in tree");
  }
  return ctx.show;
}

export default function AchievementBridge({ children }: PropsWithChildren) {
  const { show, Toast } = useAchievementToast();
  return (
    <AchievementToastContext.Provider value={{ show }}>
      <Toast />
      {children}
    </AchievementToastContext.Provider>
  );
}

