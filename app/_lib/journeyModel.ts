import { DISCOVERIES, discoveryForId, type Discovery, type Interest } from "./discoveryModel";
import { ADVENTURES } from "./adventureModel";

export type Journey = { saved: string[]; completed: string[] };
export const emptyJourney = (): Journey => ({saved: [], completed: []});
export function journeyKey(owner: string | null): string {
  return "@nova/discover/journey.v1/" + (owner === null ? "guest" : "account/" + encodeURIComponent(owner));
}
function ids(value: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && allowed.has(item)))];
}
export function normalizeJourney(value: unknown): Journey {
  if (!value || typeof value !== "object") return emptyJourney();
  const raw = value as Partial<Journey>;
  return {
    saved: ids(raw.saved, new Set(DISCOVERIES.map(d => d.id))),
    completed: ids(raw.completed, new Set(ADVENTURES.map(a => a.id))),
  };
}
export function toggleSaved(journey: Journey, id: string): Journey {
  if (!discoveryForId(id)) return journey;
  return {...journey, saved: journey.saved.includes(id) ? journey.saved.filter(x => x !== id) : [...journey.saved, id]};
}
export function markCompleted(journey: Journey, id: string): Journey {
  if (!ADVENTURES.some(a => a.id === id) || journey.completed.includes(id)) return journey;
  return {...journey, completed: [...journey.completed, id]};
}
// Intentional editorial connections between disciplines, not inferred user tracking.
const bridges: Record<string, readonly string[]> = {
  "film-cut": ["writing-pov","tech-pixels"],
  "film-sound": ["music-mood","science-shadow"],
  "art-color": ["tech-pixels","science-shadow"],
  "art-depth": ["science-shadow","film-cut"],
  "music-octave": ["math-scale","music-mood"],
  "music-mood": ["film-sound","music-octave"],
  "space-gravity": ["math-scale","science-ice"],
  "space-light": ["astro-calendar","science-shadow"],
  "astro-history": ["history-sources","space-light"],
  "astro-calendar": ["space-light","history-map"],
  "science-shadow": ["art-depth","film-sound"],
  "science-ice": ["space-gravity","history-map"],
  "math-scale": ["art-depth","space-gravity"],
  "math-chance": ["tech-search","history-sources"],
  "history-sources": ["writing-pov","astro-history"],
  "history-map": ["math-scale","astro-calendar"],
  "tech-search": ["math-chance","history-sources"],
  "tech-pixels": ["art-color","film-cut"],
  "writing-pov": ["film-cut","history-sources"],
  "writing-payoff": ["film-cut","writing-pov"],
};
export function relatedDiscoveries(id: string): Discovery[] {
  const current = discoveryForId(id);
  if (!current) return [];
  const candidates = [...(bridges[id] ?? []), ...DISCOVERIES.filter(d => d.interest === current.interest).map(d => d.id)];
  return [...new Set(candidates)].filter(x => x !== id).map(discoveryForId).filter((d): d is Discovery => !!d).slice(0,3);
}

export type DailyDetour = { discovery: Discovery; connectedFrom: Discovery };

// An optional editorial connection, not a replacement for the daily discovery.
// Rotate deterministically through unique outside-interest lessons, without tracking.
export function dailyDetour(interests: readonly Interest[], day: number): DailyDetour | undefined {
  if (!Number.isSafeInteger(day)) return undefined;
  const preferred = new Set(interests);
  const selected = DISCOVERIES.filter(d => preferred.has(d.interest));
  const unique = new Map<string, DailyDetour>();
  for (const source of selected) {
    for (const discovery of relatedDiscoveries(source.id)) {
      if (preferred.has(discovery.interest) || unique.has(discovery.id)) continue;
      unique.set(discovery.id, { discovery, connectedFrom: source });
    }
  }
  const pool = [...unique.values()];
  if (!pool.length) return undefined;
  return pool[((day % pool.length) + pool.length) % pool.length];
}
