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

  loginWithEmailPassword: (
    email: string,
    password: string
  ) => Promise<void>;

  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;

  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

const PROFILE_KEY = "user.profile.v1";
const SUPABASE_JWT_KEY = "auth.supabase.jwt";
const SUPABASE_AUTH_TOKEN_KEY = "@supabase.auth.token";

// Normalizes username: trim, default, and limit to 8 chars
function normalizeUsername(raw: string | null | undefined): string {
  const base = (raw ?? "").trim() || "Student";
  return base.slice(0, 8); // keep case, just clamp length
}

async function persistProfile(profile: LocalUserProfile | null) {
  if (!profile) {
    await AsyncStorage.removeItem(PROFILE_KEY);
  } else {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}

// Only clear auth tokens here, not the profile
async function clearSupabaseAuthStorage(reason?: string) {
  try {
    console.log(
      "[UserContext] clearing Supabase auth tokens",
      reason ? `(${reason})` : ""
    );
    await AsyncStorage.multiRemove([
      SUPABASE_JWT_KEY,
      SUPABASE_AUTH_TOKEN_KEY,
    ]);
  } catch (e) {
    console.warn("[UserContext] clearSupabaseAuthStorage error:", e);
  }
}

// Hard-clear all local game/profile caches so a "new account" starts fresh.
async function hardClearLocalGameState() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) =>
      k.startsWith("@nova/coins.") ||
      k.startsWith("@nova/streak.") ||
      k.startsWith("@nova/purchases") ||
      k === PROFILE_KEY
    );

    if (toRemove.length) {
      console.log(
        "[UserContext] hardClearLocalGameState removing keys:",
        toRemove
      );
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (e) {
    console.warn("[UserContext] hardClearLocalGameState error:", e);
  }
}

// Force Supabase-side profile to a clean baseline for a (supposed) new user.
async function hardResetServerProfileForNewUser(
  userId: string,
  username: string,
  email: string
) {
  console.log(
    "[UserContext] hardResetServerProfileForNewUser for",
    userId,
    username,
    email
  );

  // 1) Delete any existing purchases rows for this user
  try {
    const { error: delError } = await supabase
      .from("purchases")
      .delete()
      .eq("user_id", userId);

    if (delError) {
      console.warn(
        "[UserContext] hardResetServerProfileForNewUser purchases delete error:",
        delError
      );
    } else {
      console.log(
        "[UserContext] hardResetServerProfileForNewUser purchases cleared"
      );
    }
  } catch (e) {
    console.warn(
      "[UserContext] hardResetServerProfileForNewUser purchases delete threw:",
      e
    );
  }

  // 2) Upsert a clean profiles row
  try {
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        username,
        contact_email: email,
        coins: 0,
        daily_streak_current: 0,
        daily_streak_last_utc: null,
        daily_streak_best: 0,
        // mirror purchases JSON as "empty" for backwards compatibility
        purchases: { owned: {}, version: 1 },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.warn(
        "[UserContext] hardResetServerProfileForNewUser profiles upsert error:",
        profileError
      );
    } else {
      console.log(
        "[UserContext] hardResetServerProfileForNewUser profiles baseline OK"
      );
    }
  } catch (e) {
    console.warn(
      "[UserContext] hardResetServerProfileForNewUser profiles upsert threw:",
      e
    );
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<LocalUserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // ------------------ helper to hydrate from Supabase ------------------

  async function hydrateProfileFromSupabase(
    userId: string,
    authUser?: SupabaseUser | null
  ) {
    try {
      // Try to reuse local profile for this user if it exists
      let local: LocalUserProfile | null = null;
      try {
        const stored = await AsyncStorage.getItem(PROFILE_KEY);
        if (stored) {
          local = JSON.parse(stored);
        }
      } catch {
        // ignore parse errors
      }

      if (local && local.id === userId) {
        console.log(
          "[UserContext] hydrateProfile: using existing local profile",
          local.id,
          local.username
        );
        setProfile(local);
        return;
      }

      // Metadata hints from auth
      const meta: any = authUser?.user_metadata || {};
      const metaUsername =
        typeof meta.username === "string" ? meta.username : null;
      const authEmail = authUser?.email ?? null;

      // Only request columns that definitely exist
      const { data: row, error } = await supabase
        .from("profiles")
        .select("id, username, contact_email, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (error && (error as any).code !== "PGRST116") {
        console.warn("[UserContext] load profile error:", error);
      }

      let rowData: any = row;

      // If there's no row yet, seed one so the backend has something real
      if (!rowData) {
        const seededUsername = normalizeUsername(metaUsername);
        const seededEmail = authEmail;

        const seedRow: any = {
          id: userId,
          username: seededUsername,
          contact_email: seededEmail,
          coins: 0,
          daily_streak_current: 0,
          daily_streak_last_utc: null,
          daily_streak_best: 0,
        };

        console.log(
          "[UserContext] hydrateProfile: seeding empty profile row",
          seedRow
        );
        const { data: inserted, error: insertErr } = await supabase
          .from("profiles")
          .upsert(seedRow)
          .select("id, username, contact_email, avatar_url")
          .maybeSingle();

        if (insertErr) {
          console.warn(
            "[UserContext] hydrateProfile seed upsert error (continuing with local only):",
            insertErr
          );
        } else if (inserted) {
          rowData = inserted;
        }
      }

      console.log("[UserContext] hydrateProfile rowData:", rowData);

      let usernameRaw: string | null =
        (rowData && rowData.username) ?? metaUsername ?? null;
      let contactEmailRaw: string | null =
        (rowData && rowData.contact_email) ?? authEmail ?? null;
      let avatarRaw: string | null =
        (rowData && rowData.avatar_url) ?? null;

      const normalizedUsername = normalizeUsername(usernameRaw);

      const next: LocalUserProfile = {
        id: userId,
        username: normalizedUsername || null,
        name: normalizedUsername || null,
        displayName: normalizedUsername || null,
        contactEmail: contactEmailRaw,
        avatar: avatarRaw,
        avatarUrl: avatarRaw,
        avatarUri: avatarRaw,
        photoURL: avatarRaw,
        imageUrl: avatarRaw,
      };

      console.log("[UserContext] hydrateProfile final:", next);

      setProfile(next);
      await persistProfile(next);
    } catch (e) {
      console.warn("[UserContext] hydrateProfileFromSupabase error:", e);
    }
  }

  // --------------------- initial load (local + Supabase) ---------------------

  useEffect(() => {
    (async () => {
      try {
        // 1) Load local cached profile first
        const stored = await AsyncStorage.getItem(PROFILE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            console.log(
              "[UserContext] init: loaded local profile",
              parsed?.id,
              parsed?.username
            );
            setProfile(parsed);
          } catch {
            // ignore parse errors
          }
        }

        // 2) Ask Supabase for current session
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("[UserContext] getSession error:", error);

          const msg = (error as any)?.message || "";
          if (
            msg.includes("Invalid Refresh Token") ||
            msg.includes("Refresh Token Not Found")
          ) {
            await clearSupabaseAuthStorage(
              "invalid refresh token on getSession"
            );
            setSession(null);
            setSupabaseUserId(null);
            // NOTE: keep whatever profile we already loaded locally
            return;
          }
        }

        const sess = data?.session ?? null;
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

  // ----------------- react to auth changes (login / logout) ------------------

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (_event, sess) => {
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
        // don't auto-wipe profile here; signOut() handles that explicitly
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------- helpers for updating profile ----------------------

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
    let usernameNormalized: string | null = null;

    if (
      typeof patch.username === "string" ||
      typeof patch.name === "string" ||
      typeof patch.displayName === "string"
    ) {
      const rawCandidate =
        (patch.username as string | undefined) ??
        (patch.name as string | undefined) ??
        (patch.displayName as string | undefined) ??
        null;

      usernameNormalized = normalizeUsername(rawCandidate);

      if (supabaseUserId && usernameNormalized) {
        try {
          const { data: existing, error } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", usernameNormalized)
            .neq("id", supabaseUserId)
            .maybeSingle();

          if (error && (error as any).code !== "PGRST116") {
            console.warn(
              "[UserContext] username uniqueness check error:",
              error
            );
          }

          if (existing && (existing as any).id) {
            const err = new Error(
              "That username is already taken. Please choose another."
            );
            (err as any).code = "USERNAME_TAKEN";
            throw err;
          }
        } catch (e) {
          console.warn("[UserContext] updateProfile uniqueness error:", e);
          throw e;
        }
      }
    }

    const localPatch: Partial<LocalUserProfile> = { ...patch };
    if (usernameNormalized) {
      localPatch.username = usernameNormalized;
      localPatch.name = usernameNormalized;
      localPatch.displayName = usernameNormalized;
    }

    baseUpdateProfileLocal(localPatch);

    // Guest: local-only
    if (!supabaseUserId) {
      console.log(
        "[UserContext] updateProfile called while no supabaseUserId (guest); local only",
        localPatch
      );
      return;
    }

    // Build a safe row for upsert that always includes username/contact_email
    const existingUsername =
      profile?.username || profile?.name || profile?.displayName || null;
    const existingContactEmail = profile?.contactEmail ?? null;

    const row: any = {
      id: supabaseUserId,
      updated_at: new Date().toISOString(),
    };

    if (usernameNormalized || existingUsername) {
      row.username = usernameNormalized || existingUsername;
    }

    const candidateEmail =
      localPatch.contactEmail ?? (localPatch as any).contact_email;
    if (typeof candidateEmail === "string" && candidateEmail.trim()) {
      row.contact_email = candidateEmail.trim();
    } else if (existingContactEmail) {
      row.contact_email = existingContactEmail;
    } else if (session?.user?.email) {
      row.contact_email = session.user.email;
    }

    const candidateAvatar =
      localPatch.avatar ??
      localPatch.avatarUrl ??
      localPatch.avatarUri ??
      localPatch.photoURL ??
      localPatch.imageUrl ??
      profile?.avatar ??
      profile?.avatarUrl ??
      profile?.avatarUri ??
      profile?.photoURL ??
      profile?.imageUrl;

    if (typeof candidateAvatar === "string") {
      row.avatar_url = candidateAvatar;
    }

    console.log("[UserContext] updateProfile Supabase upsert row:", row);

    try {
      const { error } = await supabase.from("profiles").upsert(row);

      if (error) {
        console.warn("[UserContext] updateProfile Supabase error:", error);

        if ((error as any).code === "23505") {
          const err = new Error(
            "That username is already taken. Please choose another."
          );
          (err as any).code = "USERNAME_TAKEN";
          throw err;
        }

        // For other errors (including RLS), we still keep the local profile
        throw error;
      } else {
        console.log("[UserContext] updateProfile Supabase upsert OK");
        // Re-hydrate from Supabase so we always match what's actually stored
        try {
          if (supabaseUserId) {
            await hydrateProfileFromSupabase(
              supabaseUserId,
              session?.user ?? null
            );
          }
        } catch (rehydrateErr) {
          console.warn(
            "[UserContext] updateProfile rehydrate error:",
            rehydrateErr
          );
        }
      }
    } catch (e) {
      console.warn("[UserContext] updateProfile error:", e);
      // Local profile is already updated; we just surface the error to UI
      throw e;
    }
  };

  const setUsername = (name: string) => {
    const normalized = normalizeUsername(name);
    return updateProfile({
      username: normalized,
      name: normalized,
      displayName: normalized,
    });
  };

  const setAvatar = (uri: string | null) => {
    console.log("[UserContext] setAvatar called with", uri);
    return updateProfile({
      avatar: uri,
      avatarUrl: uri,
      avatarUri: uri,
      photoURL: uri,
      imageUrl: uri,
    });
  };

  // -------------------- auth helpers (signup/login/etc.) --------------------

  const signUpWithEmailPassword = async (
    username: string,
    email: string,
    password: string
  ) => {
    try {
      const normalizedUsername = normalizeUsername(username);

      // Make absolutely sure we aren't accidentally reusing an old session
      await clearSupabaseAuthStorage("pre signUpWithEmailPassword");
      await hardClearLocalGameState();
      setSession(null);
      setSupabaseUserId(null);
      setProfile(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: normalizedUsername },
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
        // Force server-side profile/purchases to a clean baseline
        await hardResetServerProfileForNewUser(
          authUser.id,
          normalizedUsername,
          email
        );

        setSupabaseUserId(authUser.id);

        const next: LocalUserProfile = {
          id: authUser.id,
          username: normalizedUsername,
          name: normalizedUsername,
          displayName: normalizedUsername,
          contactEmail: email,
          avatar: null,
          avatarUrl: null,
          avatarUri: null,
          photoURL: null,
          imageUrl: null,
        };

        setProfile(next);
        await persistProfile(next);

        // After seeding/resetting, hydrate from Supabase so we exactly match
        try {
          await hydrateProfileFromSupabase(authUser.id, authUser);
        } catch (e) {
          console.warn("[UserContext] signUp hydrate error:", e);
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
        // Just set the ID and let onAuthStateChange hydrate the profile.
        setSupabaseUserId(authUser.id);
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
      await AsyncStorage.removeItem(SUPABASE_AUTH_TOKEN_KEY);
    }
  };

  const deleteAccount = async () => {
    // For now, "delete account" just clears local data on this device.
    await signOut();
  };

  // -------------------- flattened values for consumers ----------------------

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
