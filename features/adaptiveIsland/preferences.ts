import { INTERESTS, type Interest } from "../../app/_lib/discoveryModel";

export type Preferences = {
  enabled: boolean;
  automatic: boolean;
  picks: Interest[];
  counts: Partial<Record<Interest, number>>;
};

export function fresh(): Preferences {
  return { enabled: false, automatic: false, picks: [], counts: {} };
}
export function profileKey(owner: string | null) {
  return "@nova/island-garden/v1/" + (owner === null ? "guest" : "account/" + encodeURIComponent(owner));
}
export function parse(raw: string | null): Preferences {
  if (!raw) return fresh();
  const data = JSON.parse(raw);
  if (!data || !Array.isArray(data.picks) || typeof data.enabled !== "boolean" ||
      typeof data.automatic !== "boolean" || !data.counts || typeof data.counts !== "object") {
    throw new Error("Invalid garden settings");
  }
  const known = INTERESTS.map(([id]) => id);
  const picks = Array.from(new Set<Interest>(data.picks.filter((v: Interest) => known.includes(v)))).slice(0, 3);
  const counts: Preferences["counts"] = {};
  if (data.enabled && data.automatic) for (const id of known) {
    const n = data.counts[id];
    if (Number.isInteger(n) && n > 0) counts[id] = Math.min(99, n);
  }
  return { enabled: data.enabled, automatic: data.enabled && data.automatic, picks, counts };
}
export function themes(p: Preferences): Interest[] {
  if (!p.enabled) return [];
  if (!p.automatic) return p.picks;
  const pool = [...new Set([...p.picks, ...INTERESTS.map(([id]) => id).filter(id => p.counts[id])])];
  return pool.sort((a,b) => (p.counts[b] || 0) - (p.counts[a] || 0)).slice(0,3);
}
export function voluntary(p: Preferences, interest: Interest): Preferences {
  if (!p.enabled || !p.automatic) return p;
  return { ...p, counts: { ...p.counts, [interest]: Math.min(99, (p.counts[interest] || 0) + 1) } };
}
export function growth(level: number) {
  return level >= 6 ? 3 : level >= 3 ? 2 : 1;
}
