// app/context/UserContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { AppState } from "react-native";

import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

type LocalUserProfile = {
  id: string;

  username?: string | null;
  name?: string | null;
  displayName?: string | null;
  usernameChangedAt?: string | null;

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

export type AskPersonalityKey =
  | "encouraging"
  | "calm_focus"
  | "coach"
  | "playful"
  | "storyteller";

const ASK_PERSONALITY_KEYS = new Set<AskPersonalityKey>([
  "encouraging",
  "calm_focus",
  "coach",
  "playful",
  "storyteller",
]);

function normalizeAskPersonality(
  value: string | null | undefined
): AskPersonalityKey {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  const aliases: Record<string, AskPersonalityKey> = {
    default: "encouraging",
    classic: "encouraging",
    classic_tutor: "encouraging",
    calm: "calm_focus",
    focused: "calm_focus",
    focus: "calm_focus",
    motivational_coach: "coach",
    hype_coach: "coach",
    fun: "playful",
    chill: "playful",
    story: "storyteller",
    story_mode: "storyteller",
  };

  const resolved = aliases[normalized] || normalized;

  return ASK_PERSONALITY_KEYS.has(resolved as AskPersonalityKey)
    ? (resolved as AskPersonalityKey)
    : "encouraging";
}

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
  usernameChangedAt: string | null;
  contactEmail: string | null;

  avatar: string | null;
  avatarUrl: string | null;
  avatarUri: string | null;
  photoURL: string | null;
  imageUrl: string | null;

  askPersonality: AskPersonalityKey;
  setAskPersonality: (p: AskPersonalityKey | string) => Promise<void>;

  askMemoryTier: string | null;
  askMemoryLimit: number | null;
  setAskMemoryConfig: (tier: string, limit: number) => Promise<void>;

  setUsername: (name: string) => Promise<void> | void;
  checkUsername: (name: string) => Promise<string>;
  changeUsername: (name: string) => Promise<{
    username: string;
    changed_at?: string | null;
    next_change_at?: string | null;
  }>;
  requestEmailChange: (
    newEmail: string,
    currentPassword: string
  ) => Promise<void>;
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

  deleteAccount: (currentPassword: string) => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

const PROFILE_KEY = "user.profile.v1";
const SUPABASE_JWT_KEY = "auth.supabase.jwt";
const SUPABASE_AUTH_TOKEN_KEY = "@supabase.auth.token";
const PENDING_EMAIL_CHANGE_KEY =
  "nova.auth.pending-email-change.v1";

// Normal HTTPS landing page used by Supabase confirmation emails.
// EXPO_PUBLIC_AUTH_CONFIRMATION_URL can override this without editing code.
const AUTH_CONFIRMATION_PAGE_URL = (
  process.env.EXPO_PUBLIC_AUTH_CONFIRMATION_URL ||
  "https://confirm.sventographystudios.com/auth/confirmed"
).trim();

const PASSWORD_RECOVERY_PAGE_URL = (
  process.env.EXPO_PUBLIC_PASSWORD_RECOVERY_URL ||
  "https://confirm.sventographystudios.com/auth/confirmed"
).trim();

const BACKEND_BASE_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "https://nove-tutoring-backend.onrender.com"
).replace(/\/+$/, "");

function normalizeUsername(raw: string | null | undefined): string {
  const base = (raw ?? "").trim() || "Student";
  return base.slice(0, 8);
}

function usernameStatusError(status: string): Error {
  const normalized = String(status || "").toLowerCase();

  const messages: Record<string, string> = {
    empty: "Please enter a username.",
    too_short: "Usernames must be at least 3 characters long.",
    too_long: "Usernames can be up to 8 characters long.",
    invalid_chars:
      "Use only letters, numbers, and underscores in your username.",
    taken: "That username is already taken.",
    same: "That is already your username.",
    cooldown:
      "You can change your username only once every 30 days.",
  };

  const error: any = new Error(
    messages[normalized] || "Could not use that username."
  );

  error.code = `USERNAME_${normalized.toUpperCase()}`;
  return error;
}

function cleanEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

async function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  message: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(message));
        }, milliseconds);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
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

  if (
    msg.includes("email_already_registered") ||
    msg.includes("user already registered") ||
    msg.includes("already been registered")
  ) {
    const duplicateEmailError: any = new Error(
      "This email is already in use."
    );
    duplicateEmailError.code = "EMAIL_ALREADY_REGISTERED";
    return duplicateEmailError;
  }

  if (msg.includes("supabase configuration") || msg.includes("missing supabase")) {
    return new Error("Supabase configuration missing from this build.");
  }

  if (msg.includes("username_cooldown")) {
    const detail = raw.includes(":") ? raw.split(":").slice(1).join(":").trim() : "";
    return new Error(
      detail
        ? `You can change your username again after ${detail}.`
        : "You can change your username only once every 30 days."
    );
  }

  if (msg.includes("username_too_short")) {
    return new Error("Usernames must be at least 3 characters long.");
  }

  if (msg.includes("username_too_long")) {
    return new Error("Usernames can be up to 8 characters long.");
  }

  if (msg.includes("username_invalid_chars")) {
    return new Error(
      "Use only letters, numbers, and underscores in your username."
    );
  }

  if (msg.includes("username_taken")) {
    return new Error("That username is already taken.");
  }

  if (msg.includes("username_change_requires_rpc")) {
    return new Error(
      "Username changes must be completed from the Change Username screen."
    );
  }

  if (msg.includes("username")) {
    return new Error("That username could not be used.");
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
      ask_personality: "encouraging",
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
  const profileRef = useRef<LocalUserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const setProfileSnapshot = (next: LocalUserProfile | null) => {
    profileRef.current = next;
    setProfile(next);
  };

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
          "id, username, username_changed_at, contact_email, avatar_url, ask_personality, ask_memory_tier, ask_memory_limit"
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
        usernameChangedAt: row?.username_changed_at ?? null,

        contactEmail: authEmail ?? row?.contact_email ?? null,

        avatar: row?.avatar_url ?? null,
        avatarUrl: row?.avatar_url ?? null,
        avatarUri: row?.avatar_url ?? null,
        photoURL: row?.avatar_url ?? null,
        imageUrl: row?.avatar_url ?? null,

        askPersonality: normalizeAskPersonality(row?.ask_personality),
        askMemoryTier: row?.ask_memory_tier ?? "free",
        askMemoryLimit,
      };

      if (
        row &&
        authEmail &&
        cleanEmail(String(row.contact_email || "")) !== cleanEmail(authEmail)
      ) {
        const { error: emailSyncError } = await supabase
          .from("profiles")
          .update({
            contact_email: cleanEmail(authEmail),
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (emailSyncError) {
          console.warn(
            "[UserContext] contact email sync error:",
            emailSyncError
          );
        }
      }

      setProfileSnapshot(next);
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
              setProfileSnapshot(parsed);
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
    /*
     * Keep this callback synchronous. Supabase auth operations can wait for
     * auth-state listeners, so awaiting storage or database work inside the
     * callback can leave signInWithPassword() or updateUser() spinning.
     */
    const { data } = supabase.auth.onAuthStateChange((_event, sess) => {
      console.log("[UserContext] onAuthStateChange:", _event);

      setSession(sess ?? null);

      const authUser = sess?.user ?? null;

      if (authUser) {
        setSupabaseUserId(authUser.id);
      } else {
        setSupabaseUserId(null);
        setProfileSnapshot(null);
      }

      setReady(true);

      /*
       * Run storage and profile hydration after the auth callback returns.
       * This avoids blocking the auth method that emitted the event.
       */
      setTimeout(() => {
        void (async () => {
          try {
            if (sess?.access_token) {
              await AsyncStorage.setItem(
                SUPABASE_JWT_KEY,
                sess.access_token
              );
            } else {
              await AsyncStorage.removeItem(SUPABASE_JWT_KEY);
            }

            if (authUser) {
              const pendingEmailChange = cleanEmail(
                (await AsyncStorage.getItem(
                  PENDING_EMAIL_CHANGE_KEY
                )) || ""
              );

              if (
                pendingEmailChange &&
                cleanEmail(authUser.email || "") ===
                  pendingEmailChange
              ) {
                await AsyncStorage.removeItem(
                  PENDING_EMAIL_CHANGE_KEY
                );
              }

              await hydrateProfileFromSupabase(
                authUser.id,
                authUser
              );
            }
          } catch (error) {
            console.warn(
              "[UserContext] deferred auth-state work warning:",
              error
            );

            if (isInvalidRefreshTokenError(error)) {
              await repairInvalidRefreshToken(
                "deferred_onAuthStateChange"
              );
              setSession(null);
              setSupabaseUserId(null);
              setProfileSnapshot(null);
            }
          }
        })();
      }, 0);
    });

    return () => {
      try {
        data?.subscription?.unsubscribe();
      } catch {}
    };
  }, []);

  /*
   * Email confirmation and password-recovery links temporarily leave Nova.
   * Refresh the authenticated user whenever Nova returns to the foreground
   * so a newly changed email appears without requiring an app restart.
   */
  useEffect(() => {
    let active = true;

    async function refreshAuthenticatedUser() {
      try {
        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
          console.warn(
            "[UserContext] foreground refreshSession error:",
            error
          );
          return;
        }

        const refreshedSession = data.session ?? null;
        const authUser = data.user ?? refreshedSession?.user ?? null;

        if (!active || !refreshedSession || !authUser) {
          return;
        }

        setSession(refreshedSession);
        setSupabaseUserId(authUser.id);

        if (refreshedSession.access_token) {
          await AsyncStorage.setItem(
            SUPABASE_JWT_KEY,
            refreshedSession.access_token
          );
        }

        const pendingEmailChange = cleanEmail(
          (await AsyncStorage.getItem(PENDING_EMAIL_CHANGE_KEY)) || ""
        );

        if (
          pendingEmailChange &&
          cleanEmail(authUser.email || "") === pendingEmailChange
        ) {
          await AsyncStorage.removeItem(PENDING_EMAIL_CHANGE_KEY);
        }

        await hydrateProfileFromSupabase(authUser.id, authUser);
        setReady(true);
      } catch (error) {
        console.warn(
          "[UserContext] foreground auth refresh warning:",
          error
        );
      }
    }

    const subscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          void refreshAuthenticatedUser();
        }
      }
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const updateProfile = async (patch: Partial<LocalUserProfile>) => {
    // Build from the latest committed snapshot rather than a stale render.
    const previous =
      profileRef.current ||
      profile || {
        id: supabaseUserId || "local",
      };

    const next: LocalUserProfile = {
      ...previous,
      ...patch,
    };

    // Update the UI immediately, then truly await the local write.
    setProfileSnapshot(next);
    await persistProfile(next);

    if (!supabaseUserId) return;

    const row: any = {
      id: supabaseUserId,
      updated_at: new Date().toISOString(),
    };

    // Identity fields are intentionally excluded from ordinary profile saves.
    // Username changes use change_username(); login email changes use Supabase Auth.

    const avatarCandidate =
      next.avatar ??
      next.avatarUrl ??
      next.avatarUri ??
      next.photoURL ??
      next.imageUrl;

    if (
      typeof avatarCandidate === "string" ||
      avatarCandidate === null
    ) {
      row.avatar_url = avatarCandidate;
    }

    if (
      typeof next.askPersonality === "string" &&
      next.askPersonality.trim()
    ) {
      row.ask_personality = next.askPersonality;
    }

    if (
      typeof next.askMemoryTier === "string" &&
      next.askMemoryTier.trim()
    ) {
      row.ask_memory_tier = next.askMemoryTier;
    }

    if (
      typeof next.askMemoryLimit === "number" &&
      Number.isFinite(next.askMemoryLimit)
    ) {
      row.ask_memory_limit = next.askMemoryLimit;
    }

    try {
      const { error } = await supabase.from("profiles").upsert(row, {
        onConflict: "id",
      });

      if (error) {
        console.warn("[UserContext] updateProfile upsert error:", error);
        throw toFriendlyAuthError(error);
      }

      // Keep the local cache aligned with the completed remote save.
      await persistProfile(next);
    } catch (e) {
      console.warn("[UserContext] updateProfile threw:", e);
      throw toFriendlyAuthError(e);
    }
  };

  const checkUsername = async (name: string): Promise<string> => {
    const candidate = String(name || "").trim();

    const { data, error } = await supabase.rpc("check_username", {
      desired_username: candidate,
    });

    if (error) {
      throw toFriendlyAuthError(error);
    }

    return String(data || "error").trim().toLowerCase();
  };

  const changeUsername = async (name: string) => {
    if (!supabaseUserId) {
      throw new Error("You must be signed in to change your username.");
    }

    const candidate = String(name || "").trim();
    const status = await checkUsername(candidate);

    if (status !== "ok" && status !== "same") {
      throw usernameStatusError(status);
    }

    const { data, error } = await supabase.rpc("change_username", {
      desired_username: candidate,
    });

    if (error) {
      throw toFriendlyAuthError(error);
    }

    await hydrateProfileFromSupabase(
      supabaseUserId,
      session?.user ?? null
    );

    return {
      username: String((data as any)?.username || candidate),
      changed_at: (data as any)?.changed_at ?? null,
      next_change_at: (data as any)?.next_change_at ?? null,
    };
  };

  // Kept as a compatibility alias for older components.
  const setUsername = async (name: string) => {
    await changeUsername(name);
  };

  const requestEmailChange = async (
    newEmail: string,
    currentPassword: string
  ) => {
    if (!session?.user?.id) {
      throw new Error("You must be signed in to change your login email.");
    }

    const currentEmail = cleanEmail(session.user.email || "");
    const normalizedEmail = cleanEmail(newEmail);
    const password = String(currentPassword || "");

    if (!currentEmail) {
      throw new Error("Nova could not determine your current login email.");
    }

    if (!password) {
      throw new Error("Enter your current password.");
    }

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("Enter a valid email address.");
    }

    if (currentEmail === normalizedEmail) {
      throw new Error("That is already your login email.");
    }

    /*
     * Verify the current password before requesting the sensitive change.
     * This creates a fresh session for the same account and does not create
     * a second account or erase any progress.
     */
    const {
      data: verificationData,
      error: verificationError,
    } = await withTimeout(
      supabase.auth.signInWithPassword({
        email: currentEmail,
        password,
      }),
      12000,
      "Nova could not verify your password in time. Please try again."
    );

    if (verificationError) {
      const lower = String(
        verificationError?.message || verificationError
      ).toLowerCase();

      if (lower.includes("invalid login credentials")) {
        throw new Error("Your current password is incorrect.");
      }

      throw toFriendlyAuthError(verificationError);
    }

    if (
      !verificationData.user ||
      verificationData.user.id !== session.user.id
    ) {
      throw new Error(
        "Nova could not verify that password for this account."
      );
    }

    if (verificationData.session) {
      setSession(verificationData.session);
      setSupabaseUserId(verificationData.user.id);

      if (verificationData.session.access_token) {
        await AsyncStorage.setItem(
          SUPABASE_JWT_KEY,
          verificationData.session.access_token
        );
      }
    }

    /*
     * Save the target before Supabase sends the message. The app uses this
     * when it returns to the foreground to refresh the same user's session.
     */
    await AsyncStorage.setItem(
      PENDING_EMAIL_CHANGE_KEY,
      normalizedEmail
    );

    let updateResult: any;

    try {
      updateResult = await withTimeout(
        supabase.auth.updateUser({
          email: normalizedEmail,
        }),
        12000,
        "Nova did not receive a response from Supabase in time."
      );
    } catch (error) {
      /*
       * The server may still have accepted the request before the local
       * response timed out, so keep the pending email and tell the user to
       * check the inbox before sending another request.
       */
      throw new Error(
        "Nova did not receive a response in time. Check the new inbox first—the confirmation email may still have been sent."
      );
    }

    if (updateResult.error) {
      await AsyncStorage.removeItem(PENDING_EMAIL_CHANGE_KEY);
      throw toFriendlyAuthError(updateResult.error);
    }
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

  const setAskPersonality = async (
    p: AskPersonalityKey | string
  ) => {
    const normalized = normalizeAskPersonality(p);

    await updateProfile({
      askPersonality: normalized,
    });
  };

  const setAskMemoryConfig = async (
    tier: string,
    limit: number
  ) => {
    const normalizedTier =
      String(tier || "free").trim().toLowerCase() || "free";

    const parsedLimit = Number(limit);

    if (!Number.isFinite(parsedLimit) || parsedLimit < 0) {
      throw new Error("Nova received an invalid Ask memory limit.");
    }

    const requestedLimit = Math.floor(parsedLimit);
    const currentLimit = Number(
      profileRef.current?.askMemoryLimit ?? 0
    );

    /**
     * A lower tier can never overwrite a higher memory purchase.
     * This also protects users who restore multiple tiers out of order.
     */
    const nextLimit = Math.max(
      Number.isFinite(currentLimit) ? currentLimit : 0,
      requestedLimit
    );

    const nextTier =
      nextLimit > requestedLimit
        ? profileRef.current?.askMemoryTier || normalizedTier
        : normalizedTier;

    await updateProfile({
      askMemoryTier: nextTier,
      askMemoryLimit: nextLimit,
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

      const usernameStatus = await checkUsername(normalizedUsername);

      if (usernameStatus !== "ok") {
        throw usernameStatusError(usernameStatus);
      }

      try {
        await supabase.auth.signOut({ scope: "local" as any });
      } catch {}

      await clearSupabaseAuthStorage("before signUp");

      setSession(null);
      setSupabaseUserId(null);
      setProfileSnapshot(null);

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: AUTH_CONFIRMATION_PAGE_URL,
          data: {
            username: normalizedUsername,
          },
        },
      });

      if (error) {
        console.log("[REAL SUPABASE SIGNUP ERROR]", error);
        throw error;
      }

      /*
       * With email-confirmation enabled, Supabase may intentionally avoid
       * returning an obvious duplicate-email error. In that case it can
       * return a user object whose identities array is empty. Treat that as
       * an existing account and do not send the user to the confirmation
       * screen, because no new confirmation code was created.
       */
      const returnedIdentities = data.user?.identities;

      if (
        data.user &&
        Array.isArray(returnedIdentities) &&
        returnedIdentities.length === 0
      ) {
        const duplicateEmailError: any = new Error(
          "This email is already in use."
        );
        duplicateEmailError.code = "EMAIL_ALREADY_REGISTERED";
        throw duplicateEmailError;
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
          usernameChangedAt: null,

          contactEmail: normalizedEmail,

          avatar: null,
          avatarUrl: null,
          avatarUri: null,
          photoURL: null,
          imageUrl: null,

          askPersonality: "encouraging",
          askMemoryTier: "free",
          askMemoryLimit: 0,
        };

        setProfileSnapshot(next);
        await persistProfile(next);

        await hydrateProfileFromSupabase(authUser.id, authUser);
      } else {
        setSupabaseUserId(null);
        setProfileSnapshot(null);
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

        // Authentication is complete at this point. Do not hold the login
        // screen open while the profile table finishes hydrating.
        setReady(true);

        void hydrateProfileFromSupabase(
          authUser.id,
          authUser
        );
      } else {
        setSupabaseUserId(null);
        setProfileSnapshot(null);
        setReady(true);
      }

      await AsyncStorage.removeItem(PENDING_EMAIL_CHANGE_KEY);
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

      const { error } = await supabase.auth.resetPasswordForEmail(
        trimmed,
        {
          redirectTo: PASSWORD_RECOVERY_PAGE_URL,
        }
      );

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
    // Update the visible app state immediately.
    setSession(null);
    setSupabaseUserId(null);
    setProfileSnapshot(null);
    setReady(true);

    // Supabase sign-out is best effort and must never trap the UI.
    try {
      const result: any = await Promise.race([
        supabase.auth.signOut({ scope: "local" as any }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Supabase local sign-out timed out")),
            2500
          )
        ),
      ]);

      if (result?.error) {
        console.warn("[UserContext] local signOut error:", result.error);
      }
    } catch (e) {
      console.warn("[UserContext] signOut warning:", e);
    }

    // Always clear every locally stored authentication value.
    await Promise.allSettled([
      clearSupabaseAuthStorage("signOut"),
      AsyncStorage.removeItem(PROFILE_KEY),
      AsyncStorage.removeItem(
        "nova.auth.pending-confirmation-email.v1"
      ),
      AsyncStorage.removeItem(PENDING_EMAIL_CHANGE_KEY),
    ]);
  };

  const deleteAccount = async (currentPassword: string) => {
    const currentSession = session;
    const currentUser = currentSession?.user ?? null;
    const currentEmail = cleanEmail(currentUser?.email || "");
    const password = String(currentPassword || "");

    if (!currentUser?.id || !currentSession?.access_token) {
      throw new Error("You must be signed in to delete your account.");
    }

    if (!currentEmail) {
      throw new Error(
        "Nova could not determine the login email for this account."
      );
    }

    if (!password) {
      throw new Error("Enter your current password.");
    }

    /*
     * Require the password again before this irreversible action. This
     * refreshes the session for the same account without creating a new one.
     */
    const {
      data: verificationData,
      error: verificationError,
    } = await withTimeout(
      supabase.auth.signInWithPassword({
        email: currentEmail,
        password,
      }),
      12000,
      "Nova could not verify your password in time. Please try again."
    );

    if (verificationError) {
      const lower = String(
        verificationError?.message || verificationError
      ).toLowerCase();

      if (lower.includes("invalid login credentials")) {
        throw new Error("Your current password is incorrect.");
      }

      throw toFriendlyAuthError(verificationError);
    }

    if (
      !verificationData.user ||
      verificationData.user.id !== currentUser.id
    ) {
      throw new Error(
        "Nova could not verify that password for this account."
      );
    }

    const accessToken =
      verificationData.session?.access_token ||
      currentSession.access_token;

    let response: Response;

    try {
      response = await withTimeout(
        fetch(`${BACKEND_BASE_URL}/api/account/delete`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            confirmation: "DELETE_MY_ACCOUNT",
          }),
        }),
        30000,
        "Nova did not receive a response from the deletion service in time."
      );
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Could not contact the account-deletion service.");
    }

    const rawBody = await response.text();

    let payload: any = null;

    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(
        payload?.error ||
          payload?.message ||
          rawBody ||
          "Nova could not permanently delete this account."
      );
    }

    /*
     * The server has removed the Auth user and linked database data.
     * Clear all local identity state without waiting for another remote call.
     */
    setSession(null);
    setSupabaseUserId(null);
    setProfileSnapshot(null);
    setReady(true);

    await Promise.allSettled([
      clearSupabaseAuthStorage("permanent account deletion"),
      AsyncStorage.removeItem(PROFILE_KEY),
      AsyncStorage.removeItem(
        "nova.auth.pending-confirmation-email.v1"
      ),
      AsyncStorage.removeItem(PENDING_EMAIL_CHANGE_KEY),
    ]);
  };

  const flatUsername =
    profile?.username ?? profile?.name ?? profile?.displayName ?? null;

  const flatName = profile?.name ?? profile?.username ?? null;
  const flatUsernameChangedAt = profile?.usernameChangedAt ?? null;

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
    usernameChangedAt: flatUsernameChangedAt,
    contactEmail: flatContactEmail,

    avatar: flatAvatar,
    avatarUrl: profile?.avatarUrl ?? null,
    avatarUri: profile?.avatarUri ?? null,
    photoURL: profile?.photoURL ?? null,
    imageUrl: profile?.imageUrl ?? null,

    askPersonality: normalizeAskPersonality(profile?.askPersonality),
    setAskPersonality,

    askMemoryTier: profile?.askMemoryTier ?? "free",
    askMemoryLimit: profile?.askMemoryLimit ?? 5,
    setAskMemoryConfig,

    setUsername,
    checkUsername,
    changeUsername,
    requestEmailChange,
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