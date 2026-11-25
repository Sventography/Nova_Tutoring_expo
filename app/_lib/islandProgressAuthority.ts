// Staging-only rollout boundary. Do not activate legacy XP writes in staging.
const STAGING_URL = "https://gouhhltupxaycuysdtrw.supabase.co";

export function usesAuthoritativeIslandProgress(url: string, owner: string | null): boolean {
  return Boolean(owner) && url.trim().replace(/\/+$/, "") === STAGING_URL;
}

function safeInteger(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

export function readAuthoritativeIslandProgress(row: unknown): {xp: number; level: number} | null {
  if (!row || typeof row !== "object") return null;
  const data = row as Record<string, unknown>;
  const xp = safeInteger(data.island_xp);
  const level = safeInteger(data.island_level);
  if (xp === null || level === null || level < 1 || level > 2147483647) return null;
  if (xp >= 150 + (level - 1) * 50) return null;
  return { xp, level };
}

// A load ticket belongs to exactly one owner and one refresh generation.
export function isCurrentIslandLoad(owner: string | null, generation: number, currentOwner: string | null, currentGeneration: number): boolean {
  return owner === currentOwner && generation === currentGeneration;
}
