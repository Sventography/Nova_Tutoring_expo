import React, { createContext, useContext, useMemo } from "react";
import { AUTH_MODE } from "../config/auth-mode";

type AuthCtx = {
  mode: "local" | "remote";
  isRemoteReady: boolean; // true in local mode; in remote, flip when your backend is ready
};

const Ctx = createContext<AuthCtx>({ mode: "local", isRemoteReady: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<AuthCtx>(() => {
    if (AUTH_MODE === "remote") {
      // When you wire a backend, set isRemoteReady accordingly.
      return { mode: "remote", isRemoteReady: false };
    }
    // Local mode: always ready, no UI nags.
    return { mode: "local", isRemoteReady: true };
  }, []);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
