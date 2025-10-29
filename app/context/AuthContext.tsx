import React, { createContext, useContext, useMemo } from "react";
import { useUser, User } from "./UserContext";

type AuthCtx = {
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, login: setUser, logout: clearUser } = useUser();

  async function login(email: string, password: string): Promise<User> {
    const e = (email || "").trim();
    const p = (password || "").trim();
    if (!e || !p) throw new Error("Missing credentials");
    const name = user?.name || e.split("@")[0] || "Guest";
    const u: User = { id: user?.id || "local", name, email: e, avatarUrl: user?.avatarUrl || undefined };
    await setUser(u);
    return u;
  }

  async function logout() {
    await clearUser();
  }

  const value = useMemo(() => ({ login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
