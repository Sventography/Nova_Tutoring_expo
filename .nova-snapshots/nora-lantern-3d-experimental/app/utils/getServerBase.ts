import { Platform } from "react-native";

/** Returns the backend base URL. Honors EXPO_PUBLIC_BACKEND_URL when set. */
export function getServerBase(): string {
  const env = (process.env.EXPO_PUBLIC_BACKEND_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");

  // Fallbacks by runtime:
  // - iOS Simulator: localhost works
  // - Android Emulator: 10.0.2.2 maps to host machine
  // - Physical devices: replace with your Mac's LAN IP
  if (Platform.OS === "android") return "http://10.0.2.2:8787";
  return "http://127.0.0.1:8787";
}
