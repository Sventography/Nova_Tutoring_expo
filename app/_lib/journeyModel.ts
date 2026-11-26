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
  "film-framing": ["writing-pov"],
  "film-lens": ["art-depth"],
  "film-light": ["science-shadow"],
  "film-continuity": ["writing-payoff"],
  "film-montage": ["writing-payoff"],
  "film-foley": ["music-mood"],
  "film-pace": ["music-mood"],
  "film-palette": ["art-color"],
  "art-negative": ["math-scale"],
  "art-value": ["film-cut"],
  "art-palette": ["tech-pixels"],
  "art-perspective": ["math-scale"],
  "art-texture": ["science-shadow"],
  "art-composition": ["film-cut"],
  "art-symmetry": ["math-scale"],
  "art-layers": ["tech-pixels"],
  "music-rhythm": ["math-scale"],
  "music-timbre": ["film-sound"],
  "music-dynamics": ["film-sound"],
  "music-tempo": ["math-scale"],
  "music-motif": ["writing-payoff"],
  "music-meter": ["math-scale"],
  "music-inversion": ["math-scale"],
  "music-rest": ["film-sound"],
  "space-phases": ["astro-calendar"],
  "space-eclipse": ["science-shadow"],
  "space-orbit": ["math-scale"],
  "space-seasons": ["astro-calendar"],
  "space-spectra": ["science-shadow"],
  "space-lightyear": ["math-scale"],
  "space-transit": ["math-chance"],
  "space-galaxy": ["math-scale"],
  "astro-zodiac": ["history-sources"],
  "astro-constellations": ["art-depth"],
  "astro-precession": ["space-light"],
  "astro-seasons": ["history-map"],
  "astro-lunar": ["space-light"],
  "astro-symbols": ["writing-pov"],
  "astro-evidence": ["math-chance"],
  "astro-almanacs": ["history-sources"],
  "science-waves": ["music-octave"],
  "science-light": ["art-color"],
  "science-force": ["space-gravity"],
  "science-density": ["math-scale"],
  "science-heat": ["art-depth"],
  "science-plants": ["history-map"],
  "science-mixtures": ["tech-search"],
  "science-variables": ["math-chance"],
  "math-fractions": ["music-octave"],
  "math-rates": ["space-light"],
  "math-symmetry": ["art-color"],
  "math-patterns": ["music-mood"],
  "math-percent": ["tech-pixels"],
  "math-average": ["history-sources"],
  "math-geometry": ["art-depth"],
  "math-graphs": ["space-gravity"],
  "history-chronology": ["writing-payoff"],
  "history-artifacts": ["art-depth"],
  "history-trade": ["tech-search"],
  "history-agriculture": ["science-ice"],
  "history-printing": ["tech-pixels"],
  "history-oral": ["writing-pov"],
  "history-causes": ["math-chance"],
  "history-maps": ["film-cut"],
  "tech-algorithm": ["math-chance"],
  "tech-binary": ["math-scale"],
  "tech-compression": ["art-color"],
  "tech-networks": ["history-map"],
  "tech-debug": ["math-chance"],
  "tech-encryption": ["history-sources"],
  "tech-accessibility": ["art-color"],
  "tech-sampling": ["music-octave"],
  "writing-dialogue": ["film-cut"],
  "writing-character": ["history-sources"],
  "writing-tension": ["film-sound"],
  "writing-symbol": ["astro-history"],
  "writing-pacing": ["film-cut"],
  "writing-setting": ["art-depth"],
  "writing-revision": ["film-cut"],
  "writing-theme": ["music-mood"],
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
