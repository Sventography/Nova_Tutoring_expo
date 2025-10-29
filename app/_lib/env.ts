// app/_lib/env.ts
// Single source of truth for reading env in the client bundle.
// Expo will only ever see EXPO_PUBLIC_* keys. We read & sanitize just one.

function isValidUrl(u: string | undefined): u is string {
  if (!u) return false;
  try {
    new URL(u); // throws on bad input
    return true;
  } catch {
    return false;
  }
}

export function getPublicEnv(key: string): string | undefined {
  const v = (typeof process !== "undefined" ? (process as any)?.env?.[key] : undefined);
  if (typeof v === "string") return v.trim();
  return undefined;
}

export function getPublicUrl(key: string): string | undefined {
  const raw = getPublicEnv(key);
  if (!raw) return undefined;

  // Strip trailing slashes, but not after scheme (http://)
  const normalized = raw.replace(/(?<!:)\/\/+$/, "").replace(/\/+$/, "");
  return isValidUrl(normalized) ? normalized : undefined;
}
