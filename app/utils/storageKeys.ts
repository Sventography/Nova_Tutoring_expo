// app/utils/storageKeys.ts
//
// Helper for generating per-user AsyncStorage keys.
// This makes it easy to keep guest data separate from
// logged-in Supabase users on the same device.
//
// Usage example:
//
//   import { scopedKey } from "../utils/storageKeys";
//
//   const key = scopedKey("nova:coins", supabaseUserId);
//   const stored = await AsyncStorage.getItem(key);
//
// - If supabaseUserId is null/empty → "nova:coins:guest"
// - If supabaseUserId is "abcd"    → "nova:coins:user:abcd"
//

/**
 * Generate a storage key scoped to a specific Supabase user ID,
 * or to a guest bucket when no user is logged in.
 *
 * @param base           The base key, e.g. "nova:coins"
 * @param supabaseUserId The current Supabase user id (or null/undefined for guest)
 * @returns              A stable, per-user storage key string
 */
export function scopedKey(base: string, supabaseUserId?: string | null): string {
  if (!supabaseUserId || supabaseUserId.trim().length === 0) {
    // Guest mode gets its own bucket so their data
    // does not collide with logged-in users.
    return `${base}:guest`;
  }

  // Logged-in users are separated by their Supabase user id.
  return `${base}:user:${supabaseUserId}`;
}

