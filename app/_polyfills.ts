// app/_polyfills.ts
// Load this BEFORE anything else (in index.js/ts do: `import "./app/_polyfills";` BEFORE `expo-router/entry`).
// Provides: gesture handler bootstrap, URL/URLSearchParams, crypto.getRandomValues, and base64 shims.

(() => {
  // 1) Must initialize gesture-handler first in React Native
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("react-native-gesture-handler");
  } catch {}

  // 2) crypto.getRandomValues for RN; harmless no-op on web if already present
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("react-native-get-random-values");
  } catch {}

  // 3) URL & URLSearchParams everywhere
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("react-native-url-polyfill/auto");
  } catch {}

  // 4) Base64 helpers (only if missing)
  const g: any =
    typeof globalThis !== "undefined"
      ? (globalThis as any)
      : typeof global !== "undefined"
      ? (global as any)
      : typeof window !== "undefined"
      ? (window as any)
      : {};

  if (typeof g.btoa !== "function") {
    try {
      g.btoa = (str: string) => {
        // Prefer Node-style Buffer if available
        if (typeof Buffer !== "undefined") {
          return Buffer.from(String(str), "binary").toString("base64");
        }
        // Browser fallback
        if (typeof window !== "undefined" && typeof (window as any).btoa === "function") {
          return (window as any).btoa(unescape(encodeURIComponent(String(str))));
        }
        // Last resort: empty string (we don't strictly rely on btoa in app flows)
        return "";
      };
    } catch {}
  }

  if (typeof g.atob !== "function") {
    try {
      g.atob = (b64: string) => {
        if (typeof Buffer !== "undefined") {
          return Buffer.from(String(b64), "base64").toString("binary");
        }
        if (typeof window !== "undefined" && typeof (window as any).atob === "function") {
          return decodeURIComponent(escape((window as any).atob(String(b64))));
        }
        return "";
      };
    } catch {}
  }
})();
