/** Normalize text (lowercase, strip punctuation, collapse spaces) */
export function norm(s: string) {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokens(s: string) { return norm(s).split(" ").filter(Boolean); }

/** Fast Levenshtein distance (1D DP) */
function lev(a: string, b: string) {
  a = norm(a); b = norm(b);
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  const dp = Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[n];
}

/** Token Jaccard similarity */
function jaccard(a: string, b: string) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const uni = A.size + B.size - inter;
  return uni === 0 ? 1 : inter / uni;
}

/** Alias registry (both-directional) */
const ALIASES = new Map<string,string[]>();
export function registerAliases(dict: Record<string,string[]>) {
  for (const [canon, list] of Object.entries(dict)) {
    const c = norm(canon);
    const arr = (ALIASES.get(c) ?? []);
    for (const v of list) {
      const vv = norm(v);
      if (!arr.includes(vv)) arr.push(vv);
    }
    ALIASES.set(c, arr);
  }
}
function aliasMatch(u: string, real: string): boolean {
  const r = norm(real);
  const arr = ALIASES.get(r) ?? [];
  if (arr.includes(norm(u))) return true;
  for (const [canon, list] of ALIASES) {
    if (norm(real) === canon && list.includes(norm(u))) return true;
    if (canon === norm(u) && list.includes(r)) return true;
  }
  return false;
}

/** Main fuzzy checker */
export function isFuzzyCorrect(user: string, real: string): boolean {
  const u = norm(user), r = norm(real);
  if (!u) return false;
  if (u === r) return true;

  // token containment (order-insensitive)
  const uTok = new Set(tokens(u)), rTok = new Set(tokens(r));
  const rInU = [...rTok].every(t => uTok.has(t));
  const uInR = [...uTok].every(t => rTok.has(t));
  if (rInU || uInR) return true;

  // aliases
  if (aliasMatch(u, r)) return true;

  // Levenshtein thresholds
  const d = lev(u, r);
  const L = Math.max(u.length, r.length);
  if (L <= 5 && d <= 1) return true;
  if (L <= 9 && d <= 2) return true;
  if (L >  9 && d <= 3) return true;

  // similar phrasing
  if (jaccard(u, r) >= 0.6) return true;

  return false;
}
