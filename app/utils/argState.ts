import AsyncStorage from "@react-native-async-storage/async-storage";

export const ARG_NV_DISCOVERED_KEY =
  "@nova/arg/act1/nv-discovered.v1";
export const ARG_WHITE_RABBIT_DISCOVERED_KEY =
  "@nova/arg/act1/white-rabbit-discovered.v1";
export const ARG_SEVENTEENTH_STAR_DISCOVERED_KEY =
  "@nova/arg/act1/seventeenth-star-discovered.v1";

export type ArgDiscoveryState = {
  nvDiscovered: boolean;
  whiteRabbitDiscovered: boolean;
  seventeenthStarDiscovered: boolean;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[“”"'’.,!?;:()[\]{}_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedMentionsNv(text: string): boolean {
  return /(^|\s)nv($|\s)/.test(text) ||
    /(^|\s)n\s+v($|\s)/.test(text);
}

function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const next = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    next[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      next[j] = Math.min(
        next[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      prev[j] = next[j];
    }
  }

  return prev[b.length];
}

function tokenNear(token: string, target: string): boolean {
  if (token === target) return true;

  const singularToken =
    token.endsWith("s") && token.length > 4
      ? token.slice(0, -1)
      : token;
  const singularTarget =
    target.endsWith("s") && target.length > 4
      ? target.slice(0, -1)
      : target;

  if (singularToken === singularTarget) return true;

  const longest = Math.max(singularToken.length, singularTarget.length);
  if (longest < 4) return false;

  return distance(singularToken, singularTarget) <= 1;
}

function hasConcept(tokens: string[], concepts: string[]): boolean {
  return tokens.some((token) =>
    concepts.some((concept) => tokenNear(token, concept))
  );
}

export function classifyNvEntryPrompt(
  value: string
): "history-note" | "options-note" | null {
  const normalized = normalize(value);
  const tokens = normalized.split(" ").filter(Boolean);
  const hasNv = normalizedMentionsNv(normalized);

  const wrong = hasConcept(tokens, [
    "wrong",
    "incorrect",
  ]);
  const answer = hasConcept(tokens, [
    "answer",
    "answers",
  ]);
  const keep = hasConcept(tokens, [
    "keep",
    "kept",
    "save",
    "saved",
    "retain",
  ]);
  const count = hasConcept(tokens, [
    "count",
    "counts",
    "matter",
    "matters",
  ]);

  if (
    wrong &&
    answer &&
    (
      (keep && count) ||
      (hasNv && (keep || count))
    )
  ) {
    return "history-note";
  }

  const believable = hasConcept(tokens, [
    "believable",
    "realistic",
    "convincing",
  ]);
  const learn = hasConcept(tokens, [
    "learn",
    "learning",
  ]);
  const mistake = hasConcept(tokens, [
    "mistake",
    "mistakes",
    "error",
  ]);

  if (wrong && believable && (learn || mistake)) {
    return "options-note";
  }

  return null;
}

export function mentionsNv(value: string): boolean {
  return normalizedMentionsNv(normalize(value));
}

export async function getArgDiscoveryState(): Promise<ArgDiscoveryState> {
  const pairs = await AsyncStorage.multiGet([
    ARG_NV_DISCOVERED_KEY,
    ARG_WHITE_RABBIT_DISCOVERED_KEY,
    ARG_SEVENTEENTH_STAR_DISCOVERED_KEY,
  ]);

  const values = new Map(pairs);

  return {
    nvDiscovered: values.get(ARG_NV_DISCOVERED_KEY) === "1",
    whiteRabbitDiscovered:
      values.get(ARG_WHITE_RABBIT_DISCOVERED_KEY) === "1",
    seventeenthStarDiscovered:
      values.get(ARG_SEVENTEENTH_STAR_DISCOVERED_KEY) === "1",
  };
}

export async function markNvDiscovered(): Promise<void> {
  await AsyncStorage.setItem(ARG_NV_DISCOVERED_KEY, "1");
}

export async function markWhiteRabbitDiscovered(): Promise<void> {
  await AsyncStorage.multiSet([
    [ARG_NV_DISCOVERED_KEY, "1"],
    [ARG_WHITE_RABBIT_DISCOVERED_KEY, "1"],
  ]);
}

export async function markSeventeenthStarDiscovered(): Promise<void> {
  await AsyncStorage.setItem(
    ARG_SEVENTEENTH_STAR_DISCOVERED_KEY,
    "1"
  );
}
