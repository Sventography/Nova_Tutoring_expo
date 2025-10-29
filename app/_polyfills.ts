// app/_polyfills.ts
// Load FIRST in App.tsx (before `expo-router/entry`).
// Provides: URL, URLSearchParams, crypto.getRandomValues, gestures, base64 shims.

import "react-native-gesture-handler";         // safe on all platforms
import "react-native-get-random-values";       // crypto.getRandomValues for RN
import "react-native-url-polyfill/auto";       // URL & URLSearchParams

// base64 helpers (only if missing — web usually has btoa/atob already)
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (!globalThis.btoa) globalThis.btoa = (str: string) => Buffer.from(str, "binary").toString("base64");
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (!globalThis.atob) globalThis.atob = (b64: string) => Buffer.from(b64, "base64").toString("binary");
} catch {
  // RN without Buffer — ignore; we don’t strictly need btoa/atob for our flows
}
