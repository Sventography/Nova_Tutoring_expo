(function(){
  if (globalThis.__URL_ENV_SANITIZED__) return;
  const suspect = /(^|_)(URL|ORIGIN|HOST|PROXY)$/i;
  const isBad = (s) => {
    if (s == null) return true;
    const v = String(s).trim();
    if (!v) return true;
    const low = v.toLowerCase();
    if (low === 'undefined' || low === 'null') return true;
    // must have a scheme://
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) return true;
    try { new URL(v); return false; } catch { return true; }
  };
  const nuked=[];
  for (const [k,v] of Object.entries(process.env)) {
    if (suspect.test(k) && isBad(v)) { delete process.env[k]; nuked.push(k); }
  }
  if (!process.env.EXPO_PUBLIC_BACKEND_URL) {
    process.env.EXPO_PUBLIC_BACKEND_URL = 'http://127.0.0.1:5055';
  }
  globalThis.__URL_ENV_SANITIZED__=true;
  if (nuked.length) console.warn('[url-sanitize] removed invalid vars:', nuked.join(', '));
})();
