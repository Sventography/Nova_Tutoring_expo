import { Platform } from "react-native";

const G: any = (globalThis as any);
if (!G.__novaCursorState) {
  G.__novaCursorState = { current: null as string | null, cleanup: null as null | (() => void) };
}

const isWeb = () => Platform.OS === "web";
const px = (n: number) => `${n}px`;
const el = (t="div") => document.createElement(t);
const rm = (x?: HTMLElement | null) => { if (x && x.parentNode) x.parentNode.removeChild(x); };

/** STATIC asset map — dynamic require is not allowed on web */
const ASSET_MAP = {
  "glow_cursor.png": require("../assets/cursors/glow_cursor.png"),
  "orb_cursor.png": require("../assets/cursors/orb_cursor.png"),
  "star_trail_cursor.png": require("../assets/cursors/star_trail_cursor.png"),
} as const;

function assetUrl(name: keyof typeof ASSET_MAP): string | null {
  try {
    const mod: any = ASSET_MAP[name];
    if (!mod) return null;
    return typeof mod === "string" ? mod : (mod?.default ?? mod?.uri ?? null);
  } catch {
    return null;
  }
}

function resetCursor() { try { (document.documentElement as HTMLElement).style.cursor = "auto"; } catch {} }

function applyGlow(): () => void {
  const cur = assetUrl("glow_cursor.png");
  const root = document.documentElement as HTMLElement;
  root.style.cursor = cur ? `url(${cur}) 8 8, auto` : "pointer";

  const dot = el();
  dot.style.position = "fixed";
  dot.style.zIndex = "2147483647";
  dot.style.pointerEvents = "none";
  dot.style.width = px(14); dot.style.height = px(14);
  dot.style.marginLeft = px(-7); dot.style.marginTop = px(-7);
  dot.style.borderRadius = "50%";
  dot.style.background = "rgba(0,255,255,0.35)";
  dot.style.boxShadow = "0 0 18px 6px rgba(0,255,255,0.6), 0 0 36px 12px rgba(0,255,255,0.3)";
  document.body.appendChild(dot);

  let x=0,y=0,tx=0,ty=0, raf=0;
  const move = (cx:number,cy:number)=>{ tx=cx; ty=cy; };
  const onMove = (e:MouseEvent)=>move(e.clientX,e.clientY);
  const onTouch= (e:TouchEvent)=>{ const t=e.touches?.[0]; if(t) move(t.clientX,t.clientY); };
  const step=()=>{ x+=(tx-x)*0.35; y+=(ty-y)*0.35; dot.style.transform=`translate(${px(x)},${px(y)})`; raf=requestAnimationFrame(step); };
  window.addEventListener("pointermove", onMove, {passive:true});
  window.addEventListener("touchmove", onTouch, {passive:true});
  raf=requestAnimationFrame(step);

  return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("pointermove",onMove); window.removeEventListener("touchmove",onTouch); rm(dot); resetCursor(); };
}

function applyOrb(): () => void {
  const cur = assetUrl("orb_cursor.png");
  const root = document.documentElement as HTMLElement;
  root.style.cursor = cur ? `url(${cur}) 10 10, auto` : "none";

  const orb = el();
  Object.assign(orb.style, {
    position:"fixed", zIndex:"2147483647", pointerEvents:"none",
    width:px(28), height:px(28), marginLeft:px(-14), marginTop:px(-14),
    borderRadius:"50%",
    background:"radial-gradient(rgba(0,255,255,0.9), rgba(0,255,255,0.05))",
    boxShadow:"0 0 22px 8px rgba(0,255,255,0.5), 0 0 44px 16px rgba(0,255,255,0.25)",
  } as CSSStyleDeclaration);
  document.body.appendChild(orb);

  const trail = el();
  Object.assign(trail.style, { position:"fixed", left:"0", top:"0", width:"100%", height:"100%", pointerEvents:"none", zIndex:"2147483646" } as CSSStyleDeclaration);
  document.body.appendChild(trail);

  let x=0,y=0,tx=0,ty=0, raf=0;
  const emit=(cx:number,cy:number)=>{ const b=el(); const size=16+Math.random()*10;
    Object.assign(b.style,{
      position:"fixed", left:px(cx-size/2), top:px(cy-size/2),
      width:px(size), height:px(size), borderRadius:"50%",
      background:"radial-gradient(rgba(0,255,255,0.7), rgba(0,255,255,0))",
      filter:"blur(1px)", opacity:"0.9", transition:"opacity 450ms ease, transform 450ms ease"
    } as CSSStyleDeclaration);
    trail.appendChild(b); requestAnimationFrame(()=>{ b.style.opacity="0"; b.style.transform="scale(1.6)"; });
    setTimeout(()=>rm(b), 500);
  };
  const onMove=(e:MouseEvent)=>{ tx=e.clientX; ty=e.clientY; emit(tx,ty); };
  const onTouch=(e:TouchEvent)=>{ const t=e.touches?.[0]; if(t){ tx=t.clientX; ty=t.clientY; emit(tx,ty);} };
  const step=()=>{ x+=(tx-x)*0.25; y+=(ty-y)*0.25; orb.style.transform=`translate(${px(x)},${px(y)})`; raf=requestAnimationFrame(step); };
  window.addEventListener("pointermove", onMove, {passive:true});
  window.addEventListener("touchmove", onTouch, {passive:true});
  raf=requestAnimationFrame(step);

  return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("pointermove",onMove); window.removeEventListener("touchmove",onTouch); rm(orb); rm(trail); resetCursor(); };
}

function applyStars(): () => void {
  const cur = assetUrl("star_trail_cursor.png");
  const root = document.documentElement as HTMLElement;
  root.style.cursor = cur ? `url(${cur}) 8 8, auto` : "crosshair";

  const rootStars = el();
  Object.assign(rootStars.style, { position:"fixed", left:"0", top:"0", width:"100%", height:"100%", pointerEvents:"none", zIndex:"2147483646" } as CSSStyleDeclaration);
  document.body.appendChild(rootStars);

  const spawn=(x:number,y:number)=>{ const a=el(); const size=8+Math.random()*8;
    Object.assign(a.style,{
      position:"fixed", left:px(x-size/2), top:px(y-size/2),
      width:px(size), height:px(size), pointerEvents:"none",
      background:"conic-gradient(from 0deg, #fff, #aff, #0ff, #aff, #fff)",
      clipPath:"polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
      filter:"drop-shadow(0 0 8px rgba(255,255,255,0.8)) drop-shadow(0 0 14px rgba(0,255,255,0.8))",
      opacity:"0.95", transition:"transform 600ms ease-out, opacity 600ms ease-out"
    } as CSSStyleDeclaration);
    rootStars.appendChild(a);
    const dx=(Math.random()-0.5)*60, dy=(Math.random()-0.5)*60, rot=(Math.random()*60-30).toFixed(1);
    requestAnimationFrame(()=>{ a.style.transform=`translate(${px(dx)},${px(dy)}) scale(0.6) rotate(${rot}deg)`; a.style.opacity="0"; });
    setTimeout(()=>rm(a), 650);
  };
  const onMove=(e:MouseEvent)=>spawn(e.clientX,e.clientY);
  const onTouch=(e:TouchEvent)=>{ const t=e.touches?.[0]; if(t) spawn(t.clientX,t.clientY); };
  window.addEventListener("pointermove", onMove, {passive:true});
  window.addEventListener("touchmove", onTouch, {passive:true});

  return ()=>{ window.removeEventListener("pointermove",onMove); window.removeEventListener("touchmove",onTouch); rm(rootStars); resetCursor(); };
}

export type CursorKind = "glowCursor" | "orbCursor" | "starTrailCursor" | null;

export function applyWebCursor(kind: CursorKind) {
  if (!isWeb()) return;
  const st = G.__novaCursorState;
  if (st.current === kind) return;
  if (st.cleanup) { try { st.cleanup(); } catch {} st.cleanup = null; resetCursor(); }

  let c: null | (()=>void) = null;
  if (kind === "glowCursor") c = applyGlow();
  else if (kind === "orbCursor") c = applyOrb();
  else if (kind === "starTrailCursor") c = applyStars();

  st.current = kind;
  st.cleanup = c;
}
export function resetWebCursor() { if (!isWeb()) return; const st=G.__novaCursorState; if (st.cleanup) st.cleanup(); st.cleanup=null; st.current=null; resetCursor(); }
