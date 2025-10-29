import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type User = { id?: string; name?: string; email?: string; avatarUrl?: string; };
type Ctx = {
  user: User | null;
  ready: boolean;
  login: (u: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<User>) => Promise<void>;
};

const UserContext = createContext<Ctx | undefined>(undefined);
const KEY = "@nova/user";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { (async () => {
    try { const raw = await AsyncStorage.getItem(KEY); if (raw) setUser(JSON.parse(raw)); }
    finally { setReady(true); }
  })(); }, []);

  useEffect(() => { (async () => {
    if (!ready) return;
    if (user) await AsyncStorage.setItem(KEY, JSON.stringify(user));
    else await AsyncStorage.removeItem(KEY);
  })(); }, [user, ready]);

  const login = async (u: User) => { setUser(u); };
  const logout = async () => { setUser(null); };
  const updateUser = async (partial: Partial<User>) => { setUser(prev => ({ ...(prev || {}), ...partial })); };

  const value = useMemo(() => ({ user, ready, login, logout, updateUser }), [user, ready]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
