/**
 * Choose a readable text color for the current theme.
 * Prefers tokens.text if provided; otherwise uses isDark heuristic.
 * You can extend this to compute contrast vs. a bg color if your tokens include it.
 */
export function resolveTextColor(tokens: any): string {
  if (tokens?.text) return tokens.text as string;
  const isDark =
    !!tokens?.isDark ||
    /dark|black|midnight|night/i.test(String(tokens?.id || ""));
  // crisp defaults tuned for your palette
  return isDark ? "#EAF6FF" : "#0A0F14";
}

export function resolveMutedTextColor(tokens: any): string {
  const base = resolveTextColor(tokens);
  // Simple alpha tweak; RN accepts rgba(). Adjust if you prefer hex.
  return base === "#0A0F14" ? "rgba(10,15,20,0.72)" : "rgba(234,246,255,0.74)";
}
