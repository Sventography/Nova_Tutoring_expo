// context/UserContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_STORAGE_KEY = "user.profile.v1";

export type LocalUser = {
  id: string;
  username?: string;
  name?: string;
  contactEmail?: string;
  avatarUri?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  photoURL?: string | null;
  imageUrl?: string | null;
};

type UserContextType = {
  user: LocalUser | null;
  isLoggedIn: boolean;
  ready: boolean;

  setUsername: (name: string) => Promise<void>;
  setAvatar: (uri: string | null) => Promise<void>;
  updateProfile: (fields: Partial<LocalUser>) => Promise<void>;
  signIn: (payload: Partial<LocalUser>) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

function createDefaultUser(overrides: Partial<LocalUser> = {}): LocalUser {
  const baseId =
    overrides.id ||
    `local-${Date.now().toString()}-${Math.floor(Math.random() * 100000)}`;
  const name =
    overrides.username ||
    overrides.name ||
    overrides.contactEmail?.split("@")[0] ||
    "Student";

  return {
    id: baseId,
    username: name,
    name,
    contactEmail: overrides.contactEmail ?? "",
    avatarUri:
      overrides.avatarUri ??
      overrides.avatarUrl ??
      overrides.avatar ??
      overrides.photoURL ??
      overrides.imageUrl ??
      null,
    avatarUrl:
      overrides.avatarUrl ??
      overrides.avatarUri ??
      overrides.avatar ??
      overrides.photoURL ??
      overrides.imageUrl ??
      null,
    avatar:
      overrides.avatar ??
      overrides.avatarUri ??
      overrides.avatarUrl ??
      overrides.photoURL ??
      overrides.imageUrl ??
      null,
    photoURL:
      overrides.photoURL ??
      overrides.avatarUri ??
      overrides.avatarUrl ??
      overrides.avatar ??
      overrides.imageUrl ??
      null,
    imageUrl:
      overrides.imageUrl ??
      overrides.avatarUri ??
      overrides.avatarUrl ??
      overrides.avatar ??
      overrides.photoURL ??
      null,
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [ready, setReady] = useState(false);

  // Load persisted user on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw) as LocalUser;
          setUser(parsed);
        }
      } catch (e) {
        console.warn("[UserContext] failed to load stored user:", e);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persistUser = async (next: LocalUser | null) => {
    setUser(next);
    if (next) {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
    } else {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const setUsername = async (name: string) => {
    const trimmed = name.trim() || "Student";
    const base = user ?? createDefaultUser({});
    const next: LocalUser = {
      ...base,
      username: trimmed,
      name: trimmed,
    };
    await persistUser(next);
  };

  const setAvatar = async (uri: string | null) => {
    const base = user ?? createDefaultUser({});
    const next: LocalUser = {
      ...base,
      avatarUri: uri,
      avatarUrl: uri,
      avatar: uri,
      photoURL: uri,
      imageUrl: uri,
    };
    await persistUser(next);
  };

  const updateProfile = async (fields: Partial<LocalUser>) => {
    const base = user ?? createDefaultUser({});
    const merged: LocalUser = {
      ...base,
      ...fields,
    };

    // normalize name/username if only one provided
    if (fields.username && !fields.name) {
      merged.name = fields.username;
    }
    if (fields.name && !fields.username) {
      merged.username = fields.name;
    }

    // normalize avatar fields if any avatar-ish thing provided
    const avatarLike =
      fields.avatarUri ??
      fields.avatarUrl ??
      fields.avatar ??
      fields.photoURL ??
      fields.imageUrl;

    if (avatarLike !== undefined) {
      merged.avatarUri = avatarLike;
      merged.avatarUrl = avatarLike;
      merged.avatar = avatarLike;
      merged.photoURL = avatarLike;
      merged.imageUrl = avatarLike;
    }

    await persistUser(merged);
  };

  const signIn = async (payload: Partial<LocalUser>) => {
    const next = createDefaultUser(payload);
    await persistUser(next);
  };

  const signOut = async () => {
    // We treat sign-out as "guest" → clear profile
    await persistUser(null);
  };

  const deleteAccount = async () => {
    // Same as signOut, but the naming makes it clearer for callers
    await persistUser(null);
  };

  const value: UserContextType = {
    user,
    isLoggedIn: !!user,
    ready,

    setUsername,
    setAvatar,
    updateProfile,
    signIn,
    signOut,
    deleteAccount,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside <UserProvider>");
  }
  return ctx;
}
