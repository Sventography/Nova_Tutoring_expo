type Sub = (...args:any[])=>void;
const map = new Map<string, Set<Sub>>();
export function on(evt:string, fn:Sub){ if(!map.has(evt)) map.set(evt,new Set()); map.get(evt)!.add(fn); return ()=>off(evt,fn); }
export function off(evt:string, fn:Sub){ map.get(evt)?.delete(fn); }
export function emit(evt:string, ...args:any[]){ map.get(evt)?.forEach(fn=>fn(...args)); }
export default { on, off, emit };
