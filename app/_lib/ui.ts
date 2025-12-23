import { Dimensions, Platform } from "react-native";

export function isSmallPhone() {
  const { width, height } = Dimensions.get("window");
  const min = Math.min(width, height);
  return min < 380; // iPhone SE-ish
}

export function pad(n: number) {
  // slightly tighter padding on small phones
  if (Platform.OS !== "web" && isSmallPhone()) return Math.max(8, Math.floor(n * 0.8));
  return n;
}
