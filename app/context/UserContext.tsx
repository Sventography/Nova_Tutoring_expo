// app/context/UserContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

type LocalUserProfile = {
  id: string;
  username?: string | null;
  name?: string | null;
  displayName?: string | null;
  contactEmail?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  avatarUri?: string | null;
  photoURL?: string | null;
  imageUrl?: string | null;
};

type UserContextValue = {
  ready: boolean;
  session: Session | null;
  supabaseUserId: string | null;
  user: LocalUserProfile | null;

  username: string | null;
  name: string | null;
  contactEmail: string | null;

  avatar: string | null;
  avatarUrl: string | null;
  avatarUri: string | null;
  photoURL: string | null;
  imageUrl: string | null;

  setUsername: (name: string) => Promise<void> | void;
  setAvatar: (uri: string | null) => Promise<void> | void;
  updateProfile: (patch: Partial<LocalUserProfile>) => Promise<void>;

  signUpWithEmailPassword: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;

  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;

  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

const PROFILE_KEY = "user.profile.v1";
const SUPABASE_JWT_KEY = "auth.supabase.jwt";

function mapProfileRow(row: any): Partial<LocalUserProfile> {
  if (!row) return {};
  const avatar = row.avatar_url ?? null;
  return {
    id: row.id,
    username: row.username ?? null,
    name: row.username ?? null,
    displayName: row.username ?? null,
    contactEmail: row.contact_email ?? null,
    avatar,
    avatarUrl: avatar,
    avatarUri: avatar,
    photoURL: avatar,
    imageUrl: avatar,
  };
}

async function persistProfile(profile: LocalUserProfile | null) {
  if (!profile) {
    await AsyncStorage.removeItem(PROFILE_KEY);
  } else {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<LocalUserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Initial load: local profile + Supabase session
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PROFILE_KEY);
        if (stored) {
          try {
            setProfile(JSON.parse(stored));
          } catch {
            // ignore parse errors
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("[UserContext] getSession error:", error);
        }
        const sess = data.session ?? null;
        setSession(sess);

        if (sess?.access_token) {
          await AsyncStorage.setItem(SUPABASE_JWT_KEY, sess.access_token);
        } else {
          await AsyncStorage.removeItem(SUPABASE_JWT_KEY);
        }

        const authUser = sess?.user ?? null;
        if (authUser) {
          setSupabaseUserId(authUser.id);
          await hydrateProfileFromSupabase(authUser.id, authUser);
        }
      } catch (e) {
        console.warn("[UserContext] init error:", e);
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to auth state changes (login / logout)
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(
      async (_event, sess) => {
        setSession(sess);
        const token = sess?.access_token;
        if (token) {
          await AsyncStorage.setItem(SUPABASE_JWT_KEY, token);
        } else {
          await AsyncStorage.removeItem(SUPABASE_JWT_KEY);
        }

        const authUser = sess?.user ?? null;
        if (authUser) {
          setSupabaseUserId(authUser.id);
          await hydrateProfileFromSupabase(authUser.id, authUser);
        } else {
          setSupabaseUserId(null);
          setProfile(null);
          await persistProfile(null);
        }
      }
    );

    return () => {
      data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hydrateProfileFromSupabase = async (
    userId: string,
    authUser?: SupabaseUser | null
  ) => {
    try {
      const { data: row, error } = await supabase
        .from("profiles")
        .select("id, username, contact_email, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (error && (error as any).code !== "PGRST116") {
        console.warn("[UserContext] load profile error:", error);
      }

      let next: LocalUserProfile = {
        id: userId,
        username: null,
        name: null,
        displayName: null,
        contactEmail: null,
        avatar: null,
        avatarUrl: null,
        avatarUri: null,
        photoURL: null,
        imageUrl: null,
      };

      if (authUser) {
        const meta: any = authUser.user_metadata || {};
        const usernameFromMeta = meta.username ?? null;
        const email = authUser.email ?? null;

        next.username = usernameFromMeta ?? row?.username ?? usernameFromMeta;
        next.name = next.username;
        next.displayName = next.username;
        next.contactEmail = row?.contact_email ?? email;
      }

      if (row) {
        next = { ...next, ...mapProfileRow(row) };
      }

      setProfile(next);
      await persistProfile(next);
    } catch (e) {
      console.warn("[UserContext] hydrateProfileFromSupabase error:", e);
    }
  };

  const baseUpdateProfileLocal = (patch: Partial<LocalUserProfile>) => {
    setProfile((prev) => {
      const next: LocalUserProfile = {
        ...(prev || {
          id: supabaseUserId || "local",
        }),
        ...patch,
      };
      persistProfile(next);
      return next;
    });
  };

  const updateProfile = async (patch: Partial<LocalUserProfile>) => {
    baseUpdateProfileLocal(patch);

    if (!supabaseUserId) {
      return;
    }

    const row: any = {
      id: supabaseUserId,
      updated_at: new Date().toISOString(),
    };

    const candidateUsername =
      patch.username ?? patch.name ?? patch.displayName;
    if (typeof candidateUsername === "string") {
      row.username = candidateUsername;
    }

    const candidateEmail =
      patch.contactEmail ?? (patch as any).contact_email;
    if (typeof candidateEmail === "string") {
      row.contact_email = candidateEmail;
    }

    const candidateAvatar =
      patch.avatar ??
      patch.avatarUrl ??
      patch.avatarUri ??
      patch.photoURL ??
      patch.imageUrl;
    if (typeof candidateAvatar === "string") {
      row.avatar_url = candidateAvatar;
    }

    try {
      const { error } = await supabase.from("profiles").upsert(row);
      if (error) {
        console.warn("[UserContext] updateProfile Supabase error:", error);
      }
    } catch (e) {
      console.warn("[UserContext] updateProfile error:", e);
    }
  };

  const setUsername = (name: string) => {
    const trimmed = name.trim() || "Student";
    return updateProfile({
      username: trimmed,
      name: trimmed,
      displayName: trimmed,
    });
  };

  const setAvatar = (uri: string | null) => {
    return updateProfile({
      avatar: uri,
      avatarUrl: uri,
      avatarUri: uri,
      photoURL: uri,
      imageUrl: uri,
    });
  };

  const signUpWithEmailPassword = async (
    username: string,
    email: string,
    password: string
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });

      if (error) {
        console.warn("[UserContext] signUp error:", error);
        throw error;
      }

      const sess = data.session ?? null;
      const authUser = data.user ?? null;
      setSession(sess);

      if (sess?.access_token) {
        await AsyncStorage.setItem(SUPABASE_JWT_KEY, sess.access_token);
      }

      if (authUser) {
        setSupabaseUserId(authUser.id);
        const next: LocalUserProfile = {
          id: authUser.id,
          username,
          name: username,
          displayName: username,
          contactEmail: email,
          avatar: null,
          avatarUrl: null,
          avatarUri: null,
          photoURL: null,
          imageUrl: null,
        };
        setProfile(next);
        await persistProfile(next);

        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: authUser.id,
            username,
            contact_email: email,
          });

        if (profileError) {
          console.warn(
            "[UserContext] profiles upsert on signUp error:",
            profileError
          );
        }
      }
    } catch (e) {
      console.warn("[UserContext] signUpWithEmailPassword threw:", e);
      throw e;
    }
  };

  const loginWithEmailPassword = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.warn("[UserContext] login error:", error);
        throw error;
      }

      const sess = data.session ?? null;
      const authUser = data.user ?? null;
      setSession(sess);

      if (sess?.access_token) {
        await AsyncStorage.setItem(SUPABASE_JWT_KEY, sess.access_token);
      }

      if (authUser) {
        setSupabaseUserId(authUser.id);
        await hydrateProfileFromSupabase(authUser.id, authUser);
      }
    } catch (e) {
      console.warn("[UserContext] loginWithEmailPassword threw:", e);
      throw e;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const trimmed = email.trim();
      if (!trimmed) {
        throw new Error("Please enter an email address first.");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo:
          "https://novatutoring-eoq65leh2-contactnovatutoring-8350s-projects.vercel.app",
      });

      if (error) {
        console.warn("[UserContext] resetPassword error:", error);
        throw error;
      }
    } catch (e) {
      console.warn("[UserContext] resetPassword threw:", e);
      throw e;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        console.warn("[UserContext] updatePassword error:", error);
        throw error;
      }
    } catch (e) {
      console.warn("[UserContext] updatePassword threw:", e);
      throw e;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[UserContext] signOut error:", e);
    } finally {
      setSession(null);
      setSupabaseUserId(null);
      setProfile(null);
      await AsyncStorage.removeItem(SUPABASE_JWT_KEY);
      await AsyncStorage.removeItem(PROFILE_KEY);
    }
  };

  const deleteAccount = async () => {
    // For now, "delete account" just clears local data on this device.
    // Full remote deletion would go through your backend with the service key.
    await signOut();
  };

  const flatUsername =
    profile?.username ?? profile?.name ?? profile?.displayName ?? null;
  const flatName = profile?.name ?? profile?.username ?? null;
  const flatContactEmail = profile?.contactEmail ?? null;

  const flatAvatar =
    profile?.avatar ??
    profile?.avatarUrl ??
    profile?.avatarUri ??
    profile?.photoURL ??
    profile?.imageUrl ??
    null;

  const value: UserContextValue = {
    ready,
    session,
    supabaseUserId,
    user: profile,

    username: flatUsername,
    name: flatName,
    contactEmail: flatContactEmail,

    avatar: flatAvatar,
    avatarUrl: profile?.avatarUrl ?? null,
    avatarUri: profile?.avatarUri ?? null,
    photoURL: profile?.photoURL ?? null,
    imageUrl: profile?.imageUrl ?? null,

    setUsername,
    setAvatar,
    updateProfile,

    signUpWithEmailPassword,
    loginWithEmailPassword,
    resetPassword,
    updatePassword,

    signOut,
    deleteAccount,
  };

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside <UserProvider>");
  }
  return ctx;
}
