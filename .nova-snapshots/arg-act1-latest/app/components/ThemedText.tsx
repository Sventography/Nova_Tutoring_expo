import * as React from "react";
import { Text, TextProps } from "react-native";
import { useTheme } from "../context/ThemeContext";

function readable(tokens: any, themeId: string): string {
  if (tokens?.text) return String(tokens.text);
  const isDark = !!tokens?.isDark || /dark|black|midnight|night/i.test(themeId);
  return isDark ? "#EAF6FF" : "#0A0F14";
}
function muted(tokens: any, base: string): string {
  return base === "#0A0F14" ? "rgba(10,15,20,0.72)" : "rgba(234,246,255,0.74)";
}

type Props = TextProps & { muted?: boolean; accent?: boolean; weight?: "regular"|"medium"|"bold" };
export default function ThemedText({ muted: m, accent, weight="regular", style, children, ...rest }: Props) {
  const theme = (() => { try { return useTheme(); } catch { return null; } })();
  const id = String((theme as any)?.id ?? (theme as any)?.themeId ?? "default");
  const tokens = (theme as any)?.tokens ?? {};
  const base = readable(tokens, id);
  const color = accent ? (tokens?.accent || base) : (m ? muted(tokens, base) : base);
  const fontWeight = weight === "bold" ? "700" : weight === "medium" ? "600" : "400";
  return <Text {...rest} style={[{ color, fontWeight }, style]}>{children}</Text>;
}
