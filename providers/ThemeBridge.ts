import { useMemo } from "react";
import { ColorSchemeName, useColorScheme } from "react-native";
type Colors = { background: string; text: string; tint: string; card: string; };
export function useThemeColors(custom?: Partial<Colors>) {
  const scheme: ColorSchemeName = useColorScheme();
  const base = scheme === "dark"
    ? { background:"#0B0B12", text:"#E6F1FF", tint:"#22D3EE", card:"#111827" }
    : { background:"#FFFFFF", text:"#0B0B12", tint:"#0EA5B7", card:"#F2F6FF" };
  return useMemo(()=>({ ...base, ...custom }), [scheme, custom]);
}
export default useThemeColors;
