import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type User = {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  avatarUri?: string;
};

type Ctx = {
  user: User | null;
  setUser: (u: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  updateProfile: (patch: Partial<User>) => Promise<void>;
  signIn: (u: Partial<User>) => Promise<void>;
  signOut: () => void;
  reload: () => Promise<void>;
};

export const USER_STORAGE_KEY = "@nova/user";
const C = createContext<Ctx | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);

  // initial load
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") setUserState(parsed as User);
        }
      } catch {}
    })();
  }, []);

  // persist on change
  useEffect(() => {
    AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user ?? {})).catch(() => {});
  }, [user]);

  const setUser = useCallback((u: User | null) => setUserState(u), []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUserState((prev) => ({ ...(prev ?? {}), ...patch }));
  }, []);

  const updateProfile = useCallback(async (patch: Partial<User>) => {
    setUserState((prev) => {
      const next = { ...(prev ?? {}), ...patch };
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const signIn = useCallback(async (u: Partial<User>) => {
    const base: User = { id: "local", name: "Student", username: "Student", avatarUri: undefined };
    const next: User = { ...base, ...(user ?? {}), ...u };
    setUserState(next);
    try { await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, [user]);

  const signOut = useCallback(() => {
    setUserState(null);
    AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify({})).catch(() => {});
  }, []);

  const reload = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setUserState(parsed as User);
      }
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ user, setUser, updateUser, updateProfile, signIn, signOut, reload }),
    [user, setUser, updateUser, updateProfile, signIn, signOut, reload]
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useUser() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
