export async function safeFetch(url: string, init?: RequestInit, timeoutMs = 15000) {
  const ac = new AbortController(); const t = setTimeout(()=>ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ac.signal });
    if (!res.ok) throw new Error(`[${res.status}] ${res.statusText} :: ${(await res.text()).slice(0,200)}`);
    return res;
  } finally { clearTimeout(t); }
}
