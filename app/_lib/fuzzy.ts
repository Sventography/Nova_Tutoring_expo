/** Tiny fuzzy filter (subsequence + token hits + prefix boost). */
export function fuzzyFilter<T>(q: string, items: T[], pick: (x: T) => string): T[] {
  const query = (q || "").trim().toLowerCase();
  if (!query) return items;
  const tokens = query.split(/\s+/).filter(Boolean);

  function score(str: string): number {
    const s = (str || "").toLowerCase();
    if (!s) return -1e9;
    let sc = 0;
    for (const t of tokens) {
      if (s.includes(t)) sc += 10;
      if (s.startsWith(t)) sc += 6;
    }
    // subsequence
    let i = 0;
    for (let k = 0; k < s.length && i < query.length; k++) if (s[k] === query[i]) i++;
    sc += i === query.length ? 8 : Math.max(0, i - 1);
    sc -= Math.min(4, Math.max(0, s.length - query.length)) * 0.1;
    return sc;
  }

  return items.map(it => ({ it, sc: score(pick(it)) }))
              .filter(x => x.sc > -1e8)
              .sort((a,b)=>b.sc-a.sc)
              .map(x => x.it);
}
