// app/hooks/useEquipped.ts
import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Match the pattern we use elsewhere: per-user storage keys
const THEME_KEY_BASE = "@nova/equipped.theme";
const CURSOR_KEY_BASE = "@nova/equipped.cursor";

function storageKey(base: string, userId?: string | null) {
  return userId ? `${base}/${userId}` : base;
}

// Lightweight canonId so themes/cursors stay consistent across the app
function canonId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v = String(raw).trim().toLowerCase();

  // normalize separators
  v = v.replace(/-/g, "_");

  if (!v.includes(":")) {
    // cursors
    if (v === "glow" || v === "cursor_glow") v = "cursor:glow";
    else if (v === "orb" || v === "cursor_orb") v = "cursor:orb";
    else if (
      v === "startrail" ||
      v === "star_trail" ||
      v === "cursor_startrail" ||
      v === "cursor_star_trail"
    ) {
      v = "cursor:star_trail";
    }
    // themes
    else if (
      [
        "neon",
        "starry",
        "pink",
        "dark",
        "mint",
        "glitter",
        "blackgold",
        "black_gold",
        "crimson",
        "emerald",
        "neonpurple",
        "neon_purple",
        "silver",
        "crimson_dream",
        "emerald_wave",
        "silver_frost",
      ].includes(v)
    ) {
      v = "theme:" + v;
    } else if (v.startsWith("cursor")) {
      v = "cursor:" + v.replace(/^cursor[_:]?/, "");
    } else if (v.startsWith("theme")) {
      v = "theme:" + v.replace(/^theme[_:]?/, "");
    }
  }

  // aliases
  if (v === "cursor:startrail") v = "cursor:star_trail";
  if (v === "theme:black_gold") v = "theme:blackgold";
  if (v === "theme:neon_purple") v = "theme:neonpurple";

  // long names → base ids
  if (v === "theme:crimson_dream") v = "theme:crimson";
  if (v === "theme:emerald_wave") v = "theme:emerald";
  if (v === "theme:silver_frost") v = "theme:silver";

  return v;
}

type UseEquippedResult = {
  themeId: string | null;
  cursorId: string | null;
  equipTheme: (id: string | null) => Promise<void>;
  equipCursor: (id: string | null) => Promise<void>;
  clearTheme: () => Promise<void>;
  clearCursor: () => Promise<void>;
};

/**
 * useEquipped
 *
 * Keeps track of currently equipped theme/cursor in AsyncStorage,
 * scoped per Supabase user (if userId is provided).
 *
 * Usage:
 *   const { supabaseUserId } = useUser();
 *   const { themeId, cursorId, equipTheme, equipCursor } = useEquipped(supabaseUserId);
 */
export function useEquipped(userId?: string | null): UseEquippedResult {
  const [themeId, setThemeId] = useState<string | null>(null);
  const [cursorId, setCursorId] = useState<string | null>(null);

  // Load on mount AND whenever userId changes
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [rawTheme, rawCursor] = await Promise.all([
          AsyncStorage.getItem(storageKey(THEME_KEY_BASE, userId)),
          AsyncStorage.getItem(storageKey(CURSOR_KEY_BASE, userId)),
        ]);

        if (cancelled) return;

        setThemeId(canonId(rawTheme));
        setCursorId(canonId(rawCursor));
      } catch (e) {
        console.log("[useEquipped] load error", e);
        if (!cancelled) {
          setThemeId(null);
          setCursorId(null);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const equipTheme = useCallback(
    async (id: string | null) => {
      const cid = canonId(id);
      const key = storageKey(THEME_KEY_BASE, userId);

      if (!cid) {
        await AsyncStorage.removeItem(key);
        setThemeId(null);
        return;
      }

      await AsyncStorage.setItem(key, cid);
      setThemeId(cid);
    },
    [userId]
  );

  const equipCursor = useCallback(
    async (id: string | null) => {
      const cid = canonId(id);
      const key = storageKey(CURSOR_KEY_BASE, userId);

      if (!cid) {
        await AsyncStorage.removeItem(key);
        setCursorId(null);
        return;
      }

      await AsyncStorage.setItem(key, cid);
      setCursorId(cid);
    },
    [userId]
  );

  const clearTheme = useCallback(async () => {
    await equipTheme(null);
  }, [equipTheme]);

  const clearCursor = useCallback(async () => {
    await equipCursor(null);
  }, [equipCursor]);

  return { themeId, cursorId, equipTheme, equipCursor, clearTheme, clearCursor };
}
