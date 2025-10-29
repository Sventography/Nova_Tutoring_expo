/**
 * Public env (OK to ship to client). Make sure your app.json has:
 *   "extra": { "backendUrl": "http://localhost:8787" }
 * …or export EXPO_PUBLIC_BACKEND_URL in your shell.
 */
export const BACKEND_URL =
  // Expo "extra" first:
  // @ts-ignore
  (globalThis as any)?.expo?.extra?.backendUrl ??
  // Public var second:
  process.env.EXPO_PUBLIC_BACKEND_URL ??
  "http://localhost:8787";
