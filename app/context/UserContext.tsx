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
  displayName?: string;
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
  setUsername: (name: string) => void;
  setAvatar: (uri: string | null) => void;
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

  // Initial load
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            setUserState(parsed as User);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on change (account is always saved)
  useEffect(() => {
    (async () => {
      try {
        if (user) {
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        } else {
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
        }
      } catch {
        // ignore
      }
    })();
  }, [user]);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUserState((prev) => ({ ...(prev ?? {}), ...patch }));
  }, []);

  const updateProfile = useCallback(async (patch: Partial<User>) => {
    setUserState((prev) => {
      const next: User = { ...(prev ?? {}), ...patch };
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next)).catch(
        () => {}
      );
      return next;
    });
  }, []);

  const setUsername = useCallback((name: string) => {
    const trimmed = name.trim();
    setUserState((prev) => {
      const next: User = {
        ...(prev ?? {}),
        username: trimmed,
        name: trimmed,
        displayName: trimmed,
      };
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next)).catch(
        () => {}
      );
      return next;
    });
  }, []);

  const setAvatar = useCallback((uri: string | null) => {
    setUserState((prev) => {
      const next: User = {
        ...(prev ?? {}),
        avatarUri: uri ?? undefined,
        avatarUrl: uri ?? undefined,
        avatar: uri ?? undefined,
        photoURL: uri ?? undefined,
        imageUrl: uri ?? undefined,
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

  /**
   * Hard delete of local account & ALL saved data on this device.
   * Uses AsyncStorage.clear(), which wipes:
   * - user profile
   * - coins
   * - achievements
   * - purchases
   * - themes / cursors, etc.
   */
  const deleteAccount = useCallback(async () => {
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
        } else {
          setUserState(null);
        }
      } else {
        setUserState(null);
      }
    } catch {
      // ignore
    } finally {
      setReady(true);
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
