// app/_config/apiBase.ts
/**
 * Reads EXPO_PUBLIC_API_BASE safely, validates it, and provides a sane fallback.
 * Also logs what the app actually sees so we can debug env issues quickly.
 */
function cleanUrl(u: string) {
  // ensure single trailing slash removal
  return u.replace(/\/+$/, "");
}

export function getApiBase(): string {
  // Expo injects env as process.env.*
  const raw =
    (typeof process !== "undefined" && (process as any)?.env?.EXPO_PUBLIC_API_BASE) ||
    (typeof process !== "undefined" && (process as any)?.env?.EXPO_PUBLIC_API_BASE_URL) ||
    "";

  const fallback = "http://127.0.0.1:5055";

  let chosen = (raw ?? "").toString().trim() || fallback;

  // Validate with URL() so bogus strings don't crash downstream
  try {
    const parsed = new URL(chosen);
    chosen = parsed.toString();
  } catch {
    console.warn("⚠️ Invalid EXPO_PUBLIC_API_BASE value:", JSON.stringify(raw));
    chosen = fallback;
  }

  const finalBase = cleanUrl(chosen);

  // one-time helpful log (Expo shows this in Metro console)
  // comment this out later if it's noisy
  // eslint-disable-next-line no-console
  console.log("🔑 EXPO_PUBLIC_API_BASE (resolved) =>", finalBase);

  return finalBase;
}

/** Join base + path robustly (handles stray slashes) */
export function joinUrl(base: string, path: string) {
  if (!path) return base;
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}
