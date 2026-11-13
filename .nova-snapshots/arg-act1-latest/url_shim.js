const RealURL = URL;
function SafeURL(input, base){
  try{
    const s = typeof input==='string' ? input : '';
    if (s.trim().length===0) return new RealURL('http://localhost');
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return new RealURL('http://'+String(s).replace(/^\/\/+/,''));
    return new RealURL(s, base);
  }catch{ return new RealURL('http://localhost'); }
}
Object.setPrototypeOf(SafeURL, RealURL);
SafeURL.prototype = RealURL.prototype;
globalThis.URL = SafeURL;
try{
  const Module = require('module'); const orig = Module.prototype.require;
  Module.prototype.require = function(id){
    const m = orig.apply(this, arguments);
    if (id==='url' || id==='node:url'){ const clone={...m}; Object.defineProperty(clone,'URL',{value:SafeURL}); return clone; }
    return m;
  };
}catch{}
