type Handler<T=any> = (payload: T) => void;
const map = new Map<string, Set<Handler>>();
export function on<T=any>(event: string, fn: Handler<T>) { if (!map.has(event)) map.set(event, new Set()); map.get(event)!.add(fn); return () => off(event, fn); }
export function off<T=any>(event: string, fn: Handler<T>) { map.get(event)?.delete(fn); }
export function emit<T=any>(event: string, payload: T) { map.get(event)?.forEach(fn => fn(payload)); }
export default { on, off, emit };
