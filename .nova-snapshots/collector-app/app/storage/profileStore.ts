// app/storage/profileStore.ts
//
// Central profile store for the *current* signed-in user.
//
// This file is intentionally **local-only** (AsyncStorage).
// Supabase/remote syncing can use these helpers, but we do NOT import
// supabase here so it never breaks your build if Supabase changes.
//
// The idea:
// - We keep a single canonical ProfileSnapshot shape
// - Everything (coins, purchases, theme, cursor, streaks) funnels
//   through this store
// - When you sign OUT, you clear this snapshot from AsyncStorage
// - When you sign IN, you hydrate it from Supabase and/or defaults,
//   then all contexts (Coins, Purchases, Theme, Cursor, Streak) read it.

import AsyncStorage from "@react-native-async-storage/async-storage";

/** Storage key for the current profile snapshot. */
const PROFILE_KEY = "@nova/profile.v1";

/** Map of purchased item IDs. We just care "true = owned". */
export type PurchaseMap = Record<string, true>;

/**
 * Canonical representation of the current user’s app profile
 * on *this device*.
 *
 * userId:
 *   - null when guest
 *   - Supabase auth user id when logged in
 */
export type ProfileSnapshot = {
  userId: string | null;
  coins: number;
  purchases: PurchaseMap;
  themeId: string | null;
  cursorId: string | null;
  dailyStreak: number;
  lastStreakAt: string | null; // ISO string or null
  lastLoginAt: string | null; // ISO string or null
};

/**
 * Shape we expect from a remote/Supabase row.
 * (Your SQL table can match this; remote code can convert as needed.)
 */
export type RemoteProfileRow = {
  id: string; // same as auth.users.id
  coins: number | null;
  purchases: string[] | null; // array of purchased IDs (canonical)
  theme_id: string | null;
  cursor_id: string | null;
  daily_streak: number | null;
  last_streak_at: string | null;
  last_login_at: string | null;
};

/** Internal helper to build a default profile for a given user id. */
export function createDefaultProfile(userId: string | null): ProfileSnapshot {
  const now = new Date().toISOString();
  return {
    userId,
    coins: 0,
    purchases: {},
    themeId: null,
    cursorId: null,
    dailyStreak: 0,
    lastStreakAt: null,
    lastLoginAt: userId ? now : null,
  };
}

/** Load *raw* JSON from AsyncStorage (or null). */
async function loadRawProfileJson(): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("[profileStore] failed to parse local profile", e);
    return null;
  }
}

/** Save *raw* JSON to AsyncStorage. */
async function saveRawProfileJson(data: any | null): Promise<void> {
  try {
    if (!data) {
      await AsyncStorage.removeItem(PROFILE_KEY);
      return;
    }
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("[profileStore] failed to save local profile", e);
  }
}

/**
 * Convert loose JSON from storage into a valid ProfileSnapshot,
 * filling any missing fields with defaults.
 */
export function hydrateProfileJson(
  raw: any,
  userId: string | null
): ProfileSnapshot {
  const base = createDefaultProfile(userId);

  if (!raw || typeof raw !== "object") return base;

  const coins = Number.isFinite(raw.coins) ? Number(raw.coins) : base.coins;
  const purchases: PurchaseMap =
    raw.purchases && typeof raw.purchases === "object"
      ? Object.keys(raw.purchases).reduce<PurchaseMap>((acc, key) => {
          if (raw.purchases[key]) acc[String(key)] = true;
          return acc;
        }, {})
      : base.purchases;

  const themeId =
    typeof raw.themeId === "string" || raw.themeId === null
      ? raw.themeId
      : base.themeId;
  const cursorId =
    typeof raw.cursorId === "string" || raw.cursorId === null
      ? raw.cursorId
      : base.cursorId;

  const dailyStreak =
    typeof raw.dailyStreak === "number" && raw.dailyStreak >= 0
      ? raw.dailyStreak
      : base.dailyStreak;

  const lastStreakAt =
    typeof raw.lastStreakAt === "string" || raw.lastStreakAt === null
      ? raw.lastStreakAt
      : base.lastStreakAt;

  const lastLoginAt =
    typeof raw.lastLoginAt === "string" || raw.lastLoginAt === null
      ? raw.lastLoginAt
      : base.lastLoginAt;

  // NOTE: userId comes from caller (Auth/User context), so we ignore raw.userId.
  return {
    userId,
    coins,
    purchases,
    themeId,
    cursorId,
    dailyStreak,
    lastStreakAt,
    lastLoginAt,
  };
}

/**
 * Load the current local profile snapshot for the given user.
 *
 * If nothing is saved yet, returns a fresh default profile.
 */
export async function loadLocalProfile(
  userId: string | null
): Promise<ProfileSnapshot> {
  const raw = await loadRawProfileJson();
  return hydrateProfileJson(raw, userId);
}

/**
 * Save the given profile snapshot to AsyncStorage.
 * This overwrites the previous snapshot.
 */
export async function saveLocalProfile(
  profile: ProfileSnapshot
): Promise<void> {
  await saveRawProfileJson(profile);
}

/**
 * Clear profile snapshot from AsyncStorage.
 * Use this when the user SIGNS OUT.
 */
export async function clearLocalProfile(): Promise<void> {
  await saveRawProfileJson(null);
}

/* ------------------------------------------------------------------------ */
/*  Merge helpers – these are for combining local + remote state            */
/* ------------------------------------------------------------------------ */

/**
 * Merge local snapshot + remote row into a single snapshot.
 *
 * Rules (you can tweak later if you want):
 * - coins: take the MAX of local and remote (never lose coins)
 * - purchases: union of all purchased ids
 * - theme/cursor: prefer remote if set, else keep local
 * - streak fields: prefer remote if present, else local
 */
export function mergeLocalAndRemoteProfile(
  local: ProfileSnapshot,
  remote: RemoteProfileRow | null
): ProfileSnapshot {
  if (!remote) {
    // No remote row yet; keep local but ensure userId matches remote.id if we have it.
    return {
      ...local,
      userId: local.userId ?? null,
    };
  }

  const remoteCoins =
    typeof remote.coins === "number" && remote.coins >= 0
      ? remote.coins
      : 0;
  const coins = Math.max(local.coins, remoteCoins);

  const remotePurchArray = Array.isArray(remote.purchases)
    ? remote.purchases
    : [];
  const mergedPurchases: PurchaseMap = { ...local.purchases };
  for (const id of remotePurchArray) {
    if (!id) continue;
    mergedPurchases[String(id)] = true;
  }

  const themeId = remote.theme_id ?? local.themeId ?? null;
  const cursorId = remote.cursor_id ?? local.cursorId ?? null;

  const dailyStreak =
    typeof remote.daily_streak === "number" && remote.daily_streak >= 0
      ? remote.daily_streak
      : local.dailyStreak;

  const lastStreakAt =
    remote.last_streak_at !== undefined
      ? remote.last_streak_at
      : local.lastStreakAt;

  const lastLoginAt =
    remote.last_login_at !== undefined
      ? remote.last_login_at
      : local.lastLoginAt;

  return {
    userId: remote.id ?? local.userId,
    coins,
    purchases: mergedPurchases,
    themeId,
    cursorId,
    dailyStreak,
    lastStreakAt,
    lastLoginAt,
  };
}

/**
 * Convert a ProfileSnapshot into a payload suitable for upserting into
 * Supabase (or your Flask -> Supabase bridge).
 *
 * You can use this in your API layer, for example:
 *
 *   const payload = toRemoteProfilePayload(profile);
 *   supabase.from("profiles").upsert(payload);
 */
export function toRemoteProfilePayload(
  profile: ProfileSnapshot
): RemoteProfileRow {
  return {
    id: profile.userId ?? "", // caller should ensure this is set for logged-in users
    coins: profile.coins,
    purchases: Object.keys(profile.purchases),
    theme_id: profile.themeId,
    cursor_id: profile.cursorId,
    daily_streak: profile.dailyStreak,
    last_streak_at: profile.lastStreakAt,
    last_login_at: profile.lastLoginAt,
  };
}

/* ------------------------------------------------------------------------ */
/*  Small mutator helpers – optional but handy for contexts                 */
/* ------------------------------------------------------------------------ */

/** Apply a new coin balance and return a NEW snapshot. */
export function withCoins(
  profile: ProfileSnapshot,
  coins: number
): ProfileSnapshot {
  return { ...profile, coins };
}

/** Increment coins by delta (can be negative) and return a NEW snapshot. */
export function addCoins(
  profile: ProfileSnapshot,
  delta: number
): ProfileSnapshot {
  return { ...profile, coins: Math.max(0, profile.coins + delta) };
}

/** Mark an item as purchased (owned) and return a NEW snapshot. */
export function addPurchase(
  profile: ProfileSnapshot,
  id: string
): ProfileSnapshot {
  if (!id) return profile;
  const purchases: PurchaseMap = { ...profile.purchases, [id]: true };
  return { ...profile, purchases };
}

/** Replace purchases map. */
export function withPurchases(
  profile: ProfileSnapshot,
  purchases: PurchaseMap
): ProfileSnapshot {
  return { ...profile, purchases: { ...purchases } };
}

/** Change theme id. */
export function withTheme(
  profile: ProfileSnapshot,
  themeId: string | null
): ProfileSnapshot {
  return { ...profile, themeId };
}

/** Change cursor id. */
export function withCursor(
  profile: ProfileSnapshot,
  cursorId: string | null
): ProfileSnapshot {
  return { ...profile, cursorId };
}

/** Update streak + timestamps. */
export function withStreak(
  profile: ProfileSnapshot,
  dailyStreak: number,
  lastStreakAt: string | null
): ProfileSnapshot {
  return { ...profile, dailyStreak, lastStreakAt };
}

/** Update lastLoginAt (e.g., on successful login). */
export function withLastLogin(
  profile: ProfileSnapshot,
  iso: string
): ProfileSnapshot {
  return { ...profile, lastLoginAt: iso };
}

