import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";

type FxCtx = {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  toggle: () => void;
};

const C = createContext<FxCtx | null>(null);

export function FxProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  const toggle = useCallback(() => {
    setEnabled(v => {
      const next = !v;
      if (__DEV__) console.log("[FxProvider] toggle →", next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (__DEV__) console.log("[FxProvider] mounted, enabled =", enabled);
  }, []);

  const value = useMemo(() => ({ enabled, setEnabled, toggle }), [enabled, toggle]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useFx() {
  const v = useContext(C);
  if (!v) throw new Error("useFx must be used inside <FxProvider>");
  return v;
}
