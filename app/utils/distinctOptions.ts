import { useMemo } from "react";

/** Basic Levenshtein */
function lev(a: string, b: string): number {
  a = a.toLowerCase(); b = b.toLowerCase();
  const dp = Array(a.length + 1).fill(0).map((_, i) => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost);
    }
  }
  return dp[a.length][b.length];
}

/** Token Jaccard */
function jaccard(a: string, b: string): number {
  const ta = new Set(tokens(a)), tb = new Set(tokens(b));
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const uni = ta.size + tb.size - inter;
  return uni === 0 ? 1 : inter / uni;
}

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
function shuffle<T>(arr: T[]): T[] { return arr.sort(() => Math.random() - 0.5); }

function isNumberStr(s: string) { return /^-?\d+(\.\d+)?$/.test(s.trim()); }
function isYearStr(s: string) { const n = Number(s.trim()); return Number.isInteger(n) && n >= 1200 && n <= 2200; }

function makeNumericDecoys(correctNum: number): string[] {
  // 6 candidates, we will pick up to 3 unique
  const mults = [0.65, 0.8, 0.9, 1.1, 1.2, 1.35];
  const raw = mults.map(m => correctNum * m);
  const uniq = Array.from(new Set(raw.map(v => {
    // pretty format: if the correct had decimals, keep 1; else use integer
    return (Math.abs(correctNum % 1) > 0) ? (Math.round(v * 10) / 10).toString() : Math.round(v).toString();
  })));
  return uniq.filter(x => x !== correctNum.toString());
}

function makeYearDecoys(y: number): string[] {
  const deltas = [-3, -1, 1, 2, 3, 5, -5, -2];
  const cand = deltas.map(d => (y + d).toString());
  return Array.from(new Set(cand)).filter(x => x !== y.toString());
}

/** Filter for distinctness against the correct */
function distinctEnough(correct: string, cand: string): boolean {
  const a = norm(correct), b = norm(cand);
  if (!b || a === b) return false;
  if (a.includes(b) || b.includes(a)) return false;                // no substrings
  if (a[0] && b[0] && a[0] === b[0] && Math.abs(a.length - b.length) <= 2) {
    // same starting letter + very close length often looks "too similar"
    return false;
  }
  const d = lev(a, b);
  const sim = jaccard(correct, cand);
  // require enough edit distance OR low token overlap
  if (d < 3 && sim > 0.4) return false;
  return true;
}

/**
 * Build up to 3 distinct distractors for a correct answer.
 * First try from pool, then fall back to numeric/year heuristics, then random noise if needed.
 */
export function buildDistinctDistractors(correct: string, pool: string[]): string[] {
  const distinctPool = shuffle([...new Set(pool.filter(Boolean))])
    .filter(p => distinctEnough(correct, p));
  const out: string[] = [];

  for (const p of distinctPool) {
    if (out.length >= 3) break;
    if (!out.includes(p) && norm(p) !== norm(correct)) out.push(p);
  }

  // If still short, try numeric/year fabrication
  if (out.length < 3) {
    const c = correct.trim();
    if (isYearStr(c)) {
      for (const y of makeYearDecoys(Number(c))) {
        if (out.length >= 3) break;
        if (!out.includes(y)) out.push(y);
      }
    } else if (isNumberStr(c)) {
      for (const n of makeNumericDecoys(Number(c))) {
        if (out.length >= 3) break;
        if (!out.includes(n)) out.push(n);
      }
    }
  }

  // Final fallback: simple labeled variants to ensure we always reach 3
  let k = 0;
  while (out.length < 3) {
    const f = `${correct} ◦${++k}`;
    if (!out.includes(f)) out.push(f);
  }

  return out.slice(0, 3);
}

/** Session-stable options: reshuffle when sessionKey changes */
export function useDistinctOptionsMemo(correct: string, allAnswers: string[], sessionKey: string | number): string[] {
  return useMemo(() => {
    if (!correct) return [];
    const wrongs = buildDistinctDistractors(correct, allAnswers);
    return shuffle([...wrongs, correct]);
  }, [correct, sessionKey, allAnswers.join("|")]);
}
