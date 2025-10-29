const RealURL = globalThis.URL;
class URLGuard extends RealURL {
  constructor(input: any, base?: any) {
    try { super(input as any, base as any); }
    catch (e: any) {
      try { console.log("URLGuard Invalid URL:", typeof input === "string" ? input : String(input), "base:", base ?? "(none)"); } catch {}
      throw e;
    }
  }
}
try { /* @ts-ignore */ globalThis.URL = URLGuard as any; } catch {}
