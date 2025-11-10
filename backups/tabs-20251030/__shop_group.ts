/** Category → Border color mapping */
export const GROUP_COLORS: Record<string, string> = {
  clothing: "#86ffb6",   // mint green
  plushie:  "#9f7aff",   // purple 💜
  virtual:  "#6ee7ff",   // cyan
  coins:    "#f7d29e",   // gold
  theme:    "#ff6ec7",   // pink
  other:    "#cccccc",   // gray fallback
};

/** Return border color for category */
export function colorForCategory(category: string): string {
  return GROUP_COLORS[category] ?? GROUP_COLORS.other;
}
