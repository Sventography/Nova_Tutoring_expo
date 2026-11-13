import React, { createContext, useContext, useMemo, useState } from 'react';

type AchToast = { message: string; type?: 'level'|'badge'|'streak'|'custom' };
type Ctx = {
  toast: AchToast | null;
  show: (t: AchToast) => void;
  clearToast: () => void;
};

const C = createContext<Ctx | null>(null);

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<AchToast | null>(null);
  const value = useMemo<Ctx>(() => ({
    toast,
    show: t => setToast(t),
    clearToast: () => setToast(null),
  }), [toast]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useAch() {
  const v = useContext(C);
  if (!v) throw new Error('useAch must be used within <AchievementsProvider>');
  return v;
}
