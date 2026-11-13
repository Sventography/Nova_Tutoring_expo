import * as React from "react";
import { Text } from "react-native";
import { useTheme } from "../context/ThemeContext";

function resolveTextColor(tokens: any, themeId: string): string {
  if (tokens?.text) return String(tokens.text);
  const isDark = !!tokens?.isDark || /dark|black|midnight|night/i.test(themeId);
  // high-contrast defaults tuned to your palette
  return isDark ? "#EAF6FF" : "#0A0F14";
}

export default function GlobalTextDefaults() {
  const theme = (() => { try { return useTheme(); } catch { return null; } })();
  const themeId = String((theme as any)?.id ?? (theme as any)?.themeId ?? "default");
  const tokens  = (theme as any)?.tokens ?? {};

  React.useEffect(() => {
    const color = resolveTextColor(tokens, themeId);
    // init/merge defaultProps safely
    // @ts-ignore
    Text.defaultProps = Text.defaultProps || {};
    const prior = (Text.defaultProps.style || {}) as any;
    Text.defaultProps.style = { ...prior, color };
  }, [themeId, (tokens as any)?.text, (tokens as any)?.isDark]);

  return null;
}
