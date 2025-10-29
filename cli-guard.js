(() => {
  // (A) Sanitize env vars that look like URLs/ORIGINS/HOSTS/PROXIES
  const suspect = /(^|_)(URL|ORIGIN|HOST|PROXY)$/i;
  const bad = [];
  const isInvalid = (v) => {
    if (v == null) return true;
    const s = String(v).trim();
    if (!s) return true;
    const low = s.toLowerCase();
    if (low === 'undefined' || low === 'null') return true;
    // require scheme:// for anything called *URL/*ORIGIN
    if (/URL|ORIGIN/i.test(suspect.source) && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) return true;
    try { new URL(s); return false; } catch { return true; }
  };
  for (const [k, v] of Object.entries(process.env)) {
    if (suspect.test(k) && isInvalid(v)) { delete process.env[k]; bad.push(k); }
  }
  if (!process.env.EXPO_PUBLIC_BACKEND_URL) {
    process.env.EXPO_PUBLIC_BACKEND_URL = 'http://127.0.0.1:5055';
  }
  if (bad.length) { console.warn('[cli-guard] unset invalid env:', bad.join(', ')); }

  // (B) Monkeypatch global URL to be forgiving for the CLI (not your app runtime)
  const NativeURL = URL;
  function SafeURL(input, base) {
    let i = input;
    try { return new NativeURL(i, base); }
    catch (e1) {
      // Empty/whitespace → safe fallback
      if (typeof i === 'string' && !i.trim()) return new NativeURL('http://127.0.0.1/', base);
      // No scheme? try http://
      if (typeof i === 'string' && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(i)) {
        try { return new NativeURL('http://' + i, base); } catch(e2) {}
      }
      // Final fallback
      return new NativeURL('http://127.0.0.1/', base);
    }
  }
  SafeURL.prototype = NativeURL.prototype;
  // Only patch once
  if (!globalThis.__CLI_URL_PATCHED__) {
    // @ts-ignore
    global.URL = SafeURL;
    globalThis.__CLI_URL_PATCHED__ = true;
    console.warn('[cli-guard] global URL patched for Expo CLI safety');
  }
})();
