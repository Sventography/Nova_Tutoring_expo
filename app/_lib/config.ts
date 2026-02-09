// app/_lib/config.ts
import { Platform } from "react-native";
import { getPublicUrl } from "./env";

/**
 * Canonical public backend base URL for the app.
 *
 * Priority:
 *  1) EXPO_PUBLIC_API_BASE           (preferred)
 *  2) EXPO_PUBLIC_BACKEND_URL       (fallback env)
 *  3) Local dev defaults on port 8787 (Flask)
 */

// Safe platform fallbacks for dev (your Flask server on 8787)
const FALLBACK =
  Platform.select({
    ios: "http://127.0.0.1:8787",
    android: "http://10.0.2.2:8787",
    web: "http://127.0.0.1:8787",
    default: "http://127.0.0.1:8787",
  }) || "http://127.0.0.1:8787";

// Read + sanitize public env keys
const ENV_API_BASE = getPublicUrl("EXPO_PUBLIC_API_BASE");
const ENV_BACKEND = getPublicUrl("EXPO_PUBLIC_BACKEND_URL");

// Prefer EXPO_PUBLIC_API_BASE, then EXPO_PUBLIC_BACKEND_URL, then FALLBACK
const ENV_BASE = ENV_API_BASE || ENV_BACKEND;

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
  console.log("API_BASE =", API_BASE, {
    ENV_API_BASE,
    ENV_BACKEND,
    FALLBACK,
  });
}
