import { Platform } from "react-native";

// Prefer EXPO_PUBLIC_API_BASE if set; else pick local device-friendly defaults.
const AUTO = Platform.select({
  ios: "http://127.0.0.1:5055",
  android: "http://10.0.2.2:5055",
  web: "http://127.0.0.1:5055",
  default: "http://127.0.0.1:5055",
});

export const API_BASE =
  (typeof process !== "undefined" && (process as any)?.env?.EXPO_PUBLIC_API_BASE) ||
  AUTO ||
  "http://127.0.0.1:5055";
export default API_BASE;
