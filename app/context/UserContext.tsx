// app/context/UserContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type User = {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  contactEmail?: string;
  avatarUri?: string;
  avatarUrl?: string;
  avatar?: string;
  photoURL?: string;
  imageUrl?: string;
};

type Ctx = {
  user: User | null;
  ready: boolean;
  setUser: (u: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  updateProfile: (patch: Partial<User>) => Promise<void>;
  setUsername: (name: string) => Promise<void>;
  setAvatar: (uri: string | null) => Promise<void>;
  signIn: (u: Partial<User>) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  reload: () => Promise<void>;
};

export const USER_STORAGE_KEY = "@nova/user";
const C = createContext<Ctx | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // initial load from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            setUserState(parsed as User);
          }
        }
      } catch {
        // ignore
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // persist user changes once ready
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify(user ?? {})
    ).catch(() => {});
  }, [user, ready]);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUserState((prev) => ({ ...(prev ?? {}), ...patch }));
  }, []);

  const updateProfile = useCallback(async (patch: Partial<User>) => {
    setUserState((prev) => {
      const next = { ...(prev ?? {}), ...patch };
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next)).catch(
        () => {}
      );
      return next;
    });
  }, []);

  const setUsername = useCallback(async (name: string) => {
    setUserState((prev) => {
      const base: User = { id: "local" };
      const next: User = {
        ...(prev ?? base),
        username: name,
        name,
      };
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next)).catch(
        () => {}
      );
      return next;
    });
  }, []);

  const setAvatar = useCallback(async (uri: string | null) => {
    setUserState((prev) => {
      const base: User = { id: "local" };
      const next: User = {
        ...(prev ?? base),
        avatarUri: uri || undefined,
        avatarUrl: uri || undefined,
        avatar: uri || undefined,
        photoURL: uri || undefined,
        imageUrl: uri || undefined,
      };
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next)).catch(
        () => {}
      );
      return next;
    });
  }, []);

  const signIn = useCallback(
    async (u: Partial<User>) => {
      const base: User = {
        id: "local",
        name: "Student",
        username: "Student",
      };
      const next: User = { ...base, ...(user ?? {}), ...u };
      setUserState(next);
      try {
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [user]
  );

  const signOut = useCallback(async () => {
    setUserState(null);
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    // hard nuke: user + coins + achievements + purchases + everything AsyncStorage
    setUserState(null);
    try {
      await AsyncStorage.clear();
    } catch {
      // ignore
    }
  }, []);

  const reload = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setUserState(parsed as User);
        }
      } else {
        setUserState(null);
      }
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      setUser,
      updateUser,
      updateProfile,
      setUsername,
      setAvatar,
      signIn,
      signOut,
      deleteAccount,
      reload,
    }),
    [
      user,
      ready,
      setUser,
      updateUser,
      updateProfile,
      setUsername,
      setAvatar,
      signIn,
      signOut,
      deleteAccount,
      reload,
    ]
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useUser() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
