export type ReviewRating = "again" | "got-it";
export type ReviewRecord = {
  dueAt: number;
  intervalDays: number;
  repetitions: number;
  ease: number;
};
export type ReviewCard = { front: string; back: string };

const DAY_MS = 86400000;
const TEN_MINUTES_MS = 600000;

export function reviewCardKey(card: ReviewCard): string {
  const text = (card.front.trim().toLowerCase() + "::" + card.back.trim().toLowerCase());
  // Stable non-cryptographic key. Prefix guards against prototype-property names.
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return "card-" + (hash >>> 0).toString(16) + "-" + text.length;
}

export function nextReview(record: ReviewRecord | undefined, rating: ReviewRating, now = Date.now()): ReviewRecord {
  const previous = record && Number.isFinite(record.dueAt) ? record : undefined;
  const ease = Math.min(2.8, Math.max(1.5, previous?.ease || 2.3));
  if (rating === "again") {
    return { dueAt: now + TEN_MINUTES_MS, intervalDays: 0, repetitions: 0, ease: Math.max(1.5, ease - 0.2) };
  }
  const repetitions = (previous?.repetitions || 0) + 1;
  const intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.min(30, Math.max(4, Math.round((previous?.intervalDays || 3) * ease)));
  return { dueAt: now + intervalDays * DAY_MS, intervalDays, repetitions, ease: Math.min(2.8, ease + 0.05) };
}

export function dueCards<T extends ReviewCard>(cards: T[], schedule: Record<string, ReviewRecord>, now = Date.now()): T[] {
  return cards.filter(card => {
    const record = schedule[reviewCardKey(card)];
    return !record || !Number.isFinite(record.dueAt) || record.dueAt <= now;
  }).sort((a, b) => {
    const dueA = schedule[reviewCardKey(a)]?.dueAt || 0;
    const dueB = schedule[reviewCardKey(b)]?.dueAt || 0;
    return dueA - dueB;
  });
}

export function parseReviewSchedule(value: string | null): Record<string, ReviewRecord> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const safe: Record<string, ReviewRecord> = {};
    for (const [key, r] of Object.entries(parsed)) {
      const record = r as Partial<ReviewRecord>;
      if (!key.startsWith("card-") || !record || !Number.isFinite(record.dueAt) || !Number.isFinite(record.intervalDays) || !Number.isFinite(record.repetitions) || !Number.isFinite(record.ease)) continue;
      safe[key] = { dueAt: record.dueAt!, intervalDays: record.intervalDays!, repetitions: record.repetitions!, ease: record.ease! };
    }
    return safe;
  } catch {
    return {};
  }
}
