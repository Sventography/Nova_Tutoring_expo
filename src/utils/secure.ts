export function maskEmail(e: string) { const [u, d] = e.split("@"); return (u?.slice(0,2) || "") + "***@" + (d || ""); }
export function sanitizeFilename(name: string) { return (name || "").replace(/[^\w.-]+/g, "_").slice(0,128); }
