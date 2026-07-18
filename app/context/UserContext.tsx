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
import * as Linking from "expo-linking";
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

  askPersonality?: string | null;
  askMemoryTier?: string | null;
  askMemoryLimit?: number | null;
};

type SignUpResult = {
  needsEmailConfirmation: boolean;
  email: string;
};

type UserContextValue = {
  ready: boolean;

  session: Session | null;
  supabaseUserId: string | null;

  user: LocalUserProfile | null;

  isLoggedIn: boolean;

  username: string | null;
  name: string | null;
  contactEmail: string | null;

  avatar: string | null;
  avatarUrl: string | null;
  avatarUri: string | null;
  photoURL: string | null;
  imageUrl: string | null;

  askPersonality: string | null;
  setAskPersonality: (p: string) => Promise<void> | void;

  askMemoryTier: string | null;
  askMemoryLimit: number | null;

  setUsername: (name: string) => Promise<void> | void;
  setAvatar: (uri: string | null) => Promise<void> | void;

  updateProfile: (patch: Partial<LocalUserProfile>) => Promise<void>;

  signUpWithEmailPassword: (
    username: string,
    email: string,
    password: string
  ) => Promise<SignUpResult>;

  loginWithEmailPassword: (email: string, password: string) => Promise<void>;

  resetPassword: (email: string) => Promise<void>;

  updatePassword: (newPassword: string) => Promise<void>;

  signOut: () => Promise<void>;

  deleteAccount: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

const PROFILE_KEY = "user.profile.v1";
const SUPABASE_JWT_KEY = "auth.supabase.jwt";
const SUPABASE_AUTH_TOKEN_KEY = "@supabase.auth.token";

const AUTH_CALLBACK_URL = Linking.createURL("auth/callback", {
  scheme: "nova",
});

function normalizeUsername(raw: string | null | undefined): string {
  const base = (raw ?? "").trim() || "Student";
 return base.slice(0, 10);
}

function cleanEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

async function persistProfile(profile: LocalUserProfile | null) {
  if (!profile) {
    await AsyncStorage.removeItem(PROFILE_KEY);
  } else {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}

function isInvalidRefreshTokenError(err: any) {
  const msg = String(err?.message || err || "").toLowerCase();

  return (
    msg.includes("invalid refresh token") ||
    msg.includes("refresh token not found")
  );
}

function formatRawError(error: any): string {
  try {
    if (!error) return "Unknown error";

    if (typeof error === "string") return error;

    if (error?.message) return String(error.message);

    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function toFriendlyAuthError(error: any) {
  const raw = formatRawError(error);
  const msg = raw.toLowerCase();

  console.log("[UserContext] auth error raw:", raw);
  console.log("[UserContext] auth error object:", error);

  if (msg.includes("network request failed")) {
    return new Error(
      `Network request failed while contacting Supabase.\n\nRaw error: ${raw}`
    );
  }

  if (msg.includes("invalid login credentials")) {
    return new Error("Incorrect email or password.");
  }

  if (msg.includes("email not confirmed")) {
    return new Error("Please confirm your email before logging in.");
  }

  if (msg.includes("user already registered")) {
    return new Error("An account with this email already exists.");
  }

  if (msg.includes("supabase configuration") || msg.includes("missing supabase")) {
    return new Error("Supabase configuration missing from this build.");
  }

  if (msg.includes("username")) {
    return new Error("That username is already taken.");
  }

  return error instanceof Error ? error : new Error(raw);
}

async function clearSupabaseAuthStorage(reason?: string) {
  try {
    console.log(
      "[UserContext] clearing Supabase auth tokens",
      reason ? `(${reason})` : ""
    );

    const keys = await AsyncStorage.getAllKeys();

    const supaKeys = keys.filter((k) => {
      const low = String(k).toLowerCase();

      return (
        low.startsWith("sb-") ||
        low.includes("supabase") ||
        low.includes("auth-token") ||
        k === SUPABASE_JWT_KEY ||
        k === SUPABASE_AUTH_TOKEN_KEY
      );
    });

    const toRemove = Array.from(
      new Set([SUPABASE_JWT_KEY, SUPABASE_AUTH_TOKEN_KEY, ...supaKeys])
    );

    if (toRemove.length) {
      console.log("[UserContext] removing auth keys:", toRemove);
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (e) {
    console.warn("[UserContext] clearSupabaseAuthStorage error:", e);
  }
}

async function repairInvalidRefreshToken(where: string) {
  console.warn(`[UserContext] repairInvalidRefreshToken @ ${where}`);

  try {
    await supabase.auth.signOut({ scope: "local" as any });
  } catch {}

  await clearSupabaseAuthStorage(`invalid refresh token @ ${where}`);
}

async function seedProfileIfNeeded(
  userId: string,
  username: string,
  email: string | null
) {
  try {
    const row = {
      id: userId,
      username,
      contact_email: email,
      avatar_url: null,
      ask_personality: null,
      ask_memory_tier: "free",
      ask_memory_limit: 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(row, {
      onConflict: "id",
    });

    if (error) {
      console.warn("[UserContext] seedProfileIfNeeded error:", error);
    }
  } catch (e) {
    console.warn("[UserContext] seedProfileIfNeeded threw:", e);
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<LocalUserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  async function hydrateProfileFromSupabase(
    userId: string,
    authUser?: SupabaseUser | null
  ) {
    try {
      const meta: any = authUser?.user_metadata || {};

      const metaUsername =
        typeof meta.username === "string" ? meta.username : null;

      const authEmail = authUser?.email ?? null;

      const { data: row, error } = await supabase
        .from("profiles")
        .select(
          "id, username, contact_email, avatar_url, ask_personality, ask_memory_tier, ask_memory_limit"
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("[UserContext] hydrate profile select error:", error);
      }

      if (!row) {
        await seedProfileIfNeeded(
          userId,
          normalizeUsername(metaUsername),
          authEmail
        );
      }

      const usernameRaw = row?.username ?? metaUsername ?? null;
      const normalizedUsername = normalizeUsername(usernameRaw);

      let askMemoryLimit: number | null = null;

      if (typeof row?.ask_memory_limit === "number") {
        askMemoryLimit = row.ask_memory_limit;
      } else if (typeof row?.ask_memory_limit === "string") {
        const parsed = parseInt(row.ask_memory_limit, 10);
        askMemoryLimit = Number.isFinite(parsed) ? parsed : null;
      }

      const next: LocalUserProfile = {
        id: userId,

        username: normalizedUsername,
        name: normalizedUsername,
        displayName: normalizedUsername,

        contactEmail: row?.contact_email ?? authEmail,

        avatar: row?.avatar_url ?? null,
        avatarUrl: row?.avatar_url ?? null,
        avatarUri: row?.avatar_url ?? null,
        photoURL: row?.avatar_url ?? null,
        imageUrl: row?.avatar_url ?? null,

        askPersonality: row?.ask_personality ?? null,
        askMemoryTier: row?.ask_memory_tier ?? "free",
        askMemoryLimit,
      };

      setProfile(next);
      await persistProfile(next);
    } catch (e) {
      console.warn("[UserContext] hydrateProfileFromSupabase error:", e);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const failSafe = setTimeout(() => {
      if (!cancelled) {
        console.warn("[UserContext] init failsafe setReady(true)");
        setReady(true);
      }
    }, 5000);

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PROFILE_KEY);

        if (stored) {
          try {
            const parsed = JSON.parse(stored);

            if (!cancelled) {
              setProfile(parsed);
            }
          } catch {}
        }

        let sess: Session | null = null;

        try {
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.warn("[UserContext] getSession error:", error);

            if (isInvalidRefreshTokenError(error)) {
              await repairInvalidRefreshToken("getSession");
            }
          } else {
            sess = data?.session ?? null;
          }
        } catch (e) {
          console.warn("[UserContext] getSession threw:", e);

          if (isInvalidRefreshTokenError(e)) {
            await repairInvalidRefreshToken("getSession_throw");
          }
        }

        if (!cancelled) {
          setSession(sess);
        }

        if (sess?.access_token) {
          await AsyncStorage.setItem(SUPABASE_JWT_KEY, sess.access_token);
        } else {
          await AsyncStorage.removeItem(SUPABASE_JWT_KEY);
        }

        const authUser = sess?.user ?? null;

        if (authUser) {
          if (!cancelled) {
            setSupabaseUserId(authUser.id);
          }

          await hydrateProfileFromSupabase(authUser.id, authUser);
        }
      } catch (e) {
        console.warn("[UserContext] init error:", e);
      } finally {
        clearTimeout(failSafe);

        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(failSafe);
    };
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      try {
        console.log("[UserContext] onAuthStateChange:", _event);

        setSession(sess ?? null);

        if (sess?.access_token) {
          await AsyncStorage.setItem(SUPABASE_JWT_KEY, sess.access_token);
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
        }

        setReady(true);
      } catch (e) {
        console.warn("[UserContext] onAuthStateChange error:", e);

        if (isInvalidRefreshTokenError(e)) {
          await repairInvalidRefreshToken("onAuthStateChange");
          setSession(null);
          setSupabaseUserId(null);
          setProfile(null);
        }

        setReady(true);
      }
    });

    return () => {
      try {
        data?.subscription?.unsubscribe();
      } catch {}
    };
  }, []);

  const updateProfile = async (patch: Partial<LocalUserProfile>) => {
    setProfile((prev) => {
      const next: LocalUserProfile = {
        ...(prev || {
          id: supabaseUserId || "local",
        }),
        ...patch,
      };

      void persistProfile(next);

      return next;
    });

    if (!supabaseUserId) return;

    const row: any = {
      id: supabaseUserId,
      updated_at: new Date().toISOString(),
    };

    const usernameCandidate =
      patch.username ?? patch.name ?? patch.displayName ?? profile?.username;

    if (typeof usernameCandidate === "string" && usernameCandidate.trim()) {
      row.username = normalizeUsername(usernameCandidate);
    }

    const emailCandidate = patch.contactEmail ?? profile?.contactEmail;

    if (typeof emailCandidate === "string" && emailCandidate.trim()) {
      row.contact_email = cleanEmail(emailCandidate);
    }

    const avatarCandidate =
      patch.avatar ??
      patch.avatarUrl ??
      patch.avatarUri ??
      patch.photoURL ??
      patch.imageUrl ??
      profile?.avatar ??
      profile?.avatarUrl ??
      profile?.avatarUri ??
      profile?.photoURL ??
      profile?.imageUrl;

    if (typeof avatarCandidate === "string") {
      row.avatar_url = avatarCandidate;
    }

    const askPersonalityCandidate =
      patch.askPersonality ?? profile?.askPersonality;

    if (
      typeof askPersonalityCandidate === "string" &&
      askPersonalityCandidate.trim()
    ) {
      row.ask_personality = askPersonalityCandidate;
    }

    const askMemoryTierCandidate =
      patch.askMemoryTier ?? profile?.askMemoryTier;

    if (
      typeof askMemoryTierCandidate === "string" &&
      askMemoryTierCandidate.trim()
    ) {
      row.ask_memory_tier = askMemoryTierCandidate;
    }

    const askMemoryLimitCandidate =
      patch.askMemoryLimit ?? profile?.askMemoryLimit;

    if (
      typeof askMemoryLimitCandidate === "number" &&
      Number.isFinite(askMemoryLimitCandidate)
    ) {
      row.ask_memory_limit = askMemoryLimitCandidate;
    }

    try {
      const { error } = await supabase.from("profiles").upsert(row, {
        onConflict: "id",
      });

      if (error) {
        console.warn("[UserContext] updateProfile upsert error:", error);
        throw toFriendlyAuthError(error);
      }
    } catch (e) {
      console.warn("[UserContext] updateProfile threw:", e);
      throw toFriendlyAuthError(e);
    }
  };

  const setUsername = async (name: string) => {
    const normalized = normalizeUsername(name);

    await updateProfile({
      username: normalized,
      name: normalized,
      displayName: normalized,
    });
  };

  const setAvatar = async (uri: string | null) => {
    await updateProfile({
      avatar: uri,
      avatarUrl: uri,
      avatarUri: uri,
      photoURL: uri,
      imageUrl: uri,
    });
  };

  const setAskPersonality = async (p: string) => {
    await updateProfile({
      askPersonality: p,
    });
  };

  const signUpWithEmailPassword = async (
    username: string,
    email: string,
    password: string
  ) => {
    try {
      const normalizedUsername = normalizeUsername(username);
      const normalizedEmail = cleanEmail(email);

      console.log("[UserContext] signUp start:", {
        email: normalizedEmail,
        username: normalizedUsername,
      });

      try {
        await supabase.auth.signOut({ scope: "local" as any });
      } catch {}

      await clearSupabaseAuthStorage("before signUp");

      setSession(null);
      setSupabaseUserId(null);
      setProfile(null);

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: AUTH_CALLBACK_URL,
          data: {
            username: normalizedUsername,
          },
        },
      });

      if (error) {
        console.log("[REAL SUPABASE SIGNUP ERROR]", error);
        throw error;
      }

      const authUser = data.user ?? null;
      const sess = data.session ?? null;
      const needsEmailConfirmation = !sess;

      setSession(sess);

      if (sess?.access_token) {
        await AsyncStorage.setItem(SUPABASE_JWT_KEY, sess.access_token);
      } else {
        await AsyncStorage.removeItem(SUPABASE_JWT_KEY);
      }

      if (authUser && sess) {
        setSupabaseUserId(authUser.id);

        await seedProfileIfNeeded(
          authUser.id,
          normalizedUsername,
          normalizedEmail
        );

        const next: LocalUserProfile = {
          id: authUser.id,

          username: normalizedUsername,
          name: normalizedUsername,
          displayName: normalizedUsername,

          contactEmail: normalizedEmail,

          avatar: null,
          avatarUrl: null,
          avatarUri: null,
          photoURL: null,
          imageUrl: null,

          askPersonality: null,
          askMemoryTier: "free",
          askMemoryLimit: 0,
        };

        setProfile(next);
        await persistProfile(next);

        await hydrateProfileFromSupabase(authUser.id, authUser);
      } else {
        setSupabaseUserId(null);
        setProfile(null);
        await persistProfile(null);
      }

      setReady(true);

      return {
        needsEmailConfirmation,
        email: normalizedEmail,
      };
    } catch (e) {
      console.warn("[UserContext] signUpWithEmailPassword threw:", e);
      setReady(true);
      throw toFriendlyAuthError(e);
    }
  };

  const loginWithEmailPassword = async (email: string, password: string) => {
    try {
      const normalizedEmail = cleanEmail(email);

      console.log("[UserContext] login start:", {
        email: normalizedEmail,
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        console.log("[REAL SUPABASE LOGIN ERROR]", error);
        throw error;
      }

      const authUser = data.user ?? null;
      const sess = data.session ?? null;

      setSession(sess);

      if (sess?.access_token) {
        await AsyncStorage.setItem(SUPABASE_JWT_KEY, sess.access_token);
      } else {
        await AsyncStorage.removeItem(SUPABASE_JWT_KEY);
      }

      if (authUser) {
        setSupabaseUserId(authUser.id);
        await hydrateProfileFromSupabase(authUser.id, authUser);
      } else {
        setSupabaseUserId(null);
        setProfile(null);
      }

      setReady(true);
    } catch (e) {
      console.warn("[UserContext] loginWithEmailPassword threw:", e);
      setReady(true);
      throw toFriendlyAuthError(e);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const trimmed = cleanEmail(email);

      if (!trimmed) {
        throw new Error("Please enter an email address first.");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo:
          "https://novatutoring-eoq65leh2-contactnovatutoring-8350s-projects.vercel.app",
      });

      if (error) {
        console.log("[REAL SUPABASE RESET ERROR]", error);
        throw error;
      }
    } catch (e) {
      console.warn("[UserContext] resetPassword threw:", e);
      throw toFriendlyAuthError(e);
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.log("[REAL SUPABASE UPDATE PASSWORD ERROR]", error);
        throw error;
      }
    } catch (e) {
      console.warn("[UserContext] updatePassword threw:", e);
      throw toFriendlyAuthError(e);
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

      await clearSupabaseAuthStorage("signOut");
      await AsyncStorage.removeItem(PROFILE_KEY);

      setReady(true);
    }
  };

  const deleteAccount = async () => {
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

    isLoggedIn: !!session?.user?.id,

    username: flatUsername,
    name: flatName,
    contactEmail: flatContactEmail,

    avatar: flatAvatar,
    avatarUrl: profile?.avatarUrl ?? null,
    avatarUri: profile?.avatarUri ?? null,
    photoURL: profile?.photoURL ?? null,
    imageUrl: profile?.imageUrl ?? null,

    askPersonality: profile?.askPersonality ?? null,
    setAskPersonality,

    askMemoryTier: profile?.askMemoryTier ?? null,
    askMemoryLimit: profile?.askMemoryLimit ?? null,

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

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);

  if (!ctx) {
    throw new Error("useUser must be used inside <UserProvider>");
  }

  return ctx;
}