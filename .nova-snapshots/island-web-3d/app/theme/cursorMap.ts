const CURSOR_MAP: Record<string, string> = { default: "auto", starTrail: "auto", orb: "auto" };
export function getCursorForId(id:string){ return CURSOR_MAP[id] || CURSOR_MAP.default; }
export default CURSOR_MAP;
