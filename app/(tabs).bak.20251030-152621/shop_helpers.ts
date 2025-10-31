/** Type-based border colors + category mapping */
export const GROUP_COLORS = {
  clothing: "#86ffb6",  // apparel + accessories + stationery
  plushie:  "#6ee7ff",
  virtual:  "#8de4ff",  // themes / cursor / bundle / misc
  coins:    "#9ef7d2",
  other:    "rgba(0,229,255,0.7)",
} as const;

export function colorForCategory(catNameRaw: string) {
  const cat = String(catNameRaw || "").toLowerCase();
  if (cat === "plushie") return GROUP_COLORS.plushie;
  if (cat === "coins")   return GROUP_COLORS.coins;
  if (["theme","cursor","bundle","misc"].includes(cat)) return GROUP_COLORS.virtual;
  if (["apparel","accessories","stationery"].includes(cat)) return GROUP_COLORS.clothing;
  return GROUP_COLORS.other;
}
