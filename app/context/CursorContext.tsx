import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "./ThemeContext";

export type CursorId = "cursor:glow" | "cursor:orb" | "cursor:star-trail";

type CursorTokens = {
  id: CursorId;
  color: string;       // main tint
  trail?: string;      // optional trail color
  radius?: number;     // visual radius for effects
};

type Ctx = {
  cursorId: CursorId;
  tokens: CursorTokens;
  setCursorById: (id: CursorId) => void;
};

const STORAGE_KEY = "@nova/cursor";
const CtxObj = createContext<Ctx | null>(null);

export function CursorProvider({ children }: { children: React.ReactNode }) {
  const { tokens: theme } = useTheme();
  const [cursorId, setCursorId] = useState<CursorId>("cursor:glow");

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setCursorId((saved as CursorId) || "cursor:glow");
      } catch {}
    })();
  }, []);

  const setCursorById = useCallback((id: CursorId) => {
    setCursorId(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, []);

  const tokens = useMemo<CursorTokens>(() => {
    // Tie cursor colors to the current theme
    const main = theme.tint || theme.accent || "#6CE1FF";
    const trail = theme.glow || theme.accent || main;
    switch (cursorId) {
      case "cursor:orb":
        return { id: cursorId, color: main, radius: 10, trail };
      case "cursor:star-trail":
        return { id: cursorId, color: main, radius: 8, trail };
      case "cursor:glow":
      default:
        return { id: "cursor:glow", color: main, radius: 6, trail };
    }
  }, [cursorId, theme]);

  const value = useMemo(() => ({ cursorId, tokens, setCursorById }), [cursorId, tokens, setCursorById]);
  return <CtxObj.Provider value={value}>{children}</CtxObj.Provider>;
}

export function useCursor() {
  const v = useContext(CtxObj);
  if (!v) throw new Error("useCursor must be used inside CursorProvider");
  return v;
}
