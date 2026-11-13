// app/_lib/config.ts
import { Platform } from "react-native";
import { getPublicUrl } from "./env";

// Safe platform fallbacks for dev
const FALLBACK =
  Platform.select({
    ios: "http://127.0.0.1:5055",
    android: "http://10.0.2.2:5055",
    web: "http://127.0.0.1:5055",
    default: "http://127.0.0.1:5055",
  }) || "http://127.0.0.1:5055";

// Read + sanitize exactly one public key
const ENV_BASE = getPublicUrl("EXPO_PUBLIC_API_BASE");

export const API_BASE = ENV_BASE || FALLBACK;

// Useful derived endpoints
export const API = {
  ask: `${API_BASE}/api/ask`,
  shop: {
    list: `${API_BASE}/api/shop/list`,
    order: `${API_BASE}/api/order`,
  },
  health: `${API_BASE}/health`,
};

// Debug logging
if (__DEV__) {
  console.log("API_BASE =", API_BASE);
}
