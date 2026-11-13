import { useEffect } from "react";
import { Platform } from "react-native";
import { useCursor } from "../context/CursorContext";

// util: ensure a singleton DOM node
function ensureEl(id: string, styles: Partial<CSSStyleDeclaration> = {}) {
  let el = document.getElementById(id) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
  }
  Object.assign(el.style, styles);
  return el;
}

export default function useApplyWebCursor() {
  const { cursorId } = useCursor(); // "glowCursor" | "orbCursor" | "starTrailCursor" | null

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const body = document.body;
    // reset classes + clean any nodes
    body.classList.remove("cursor-glow", "cursor-orb", "cursor-star");
    const orb = document.getElementById("nova-cursor-orb");
    if (orb) orb.remove();

    // remove star trail container if not star
    if (cursorId !== "starTrailCursor") {
      const trail = document.getElementById("nova-cursor-stars");
      if (trail) trail.remove();
      // restore normal cursor if not glow
      body.style.cursor = "";
    }

    if (!cursorId) return;

    if (cursorId === "glowCursor") {
      // lightweight: just a CSS cursor image (set in global.css)
      body.classList.add("cursor-glow");
      return;
    }

    if (cursorId === "orbCursor") {
      body.classList.add("cursor-orb");
      // follower orb
      const orbEl = ensureEl("nova-cursor-orb", {
        position: "fixed",
        left: "0px",
        top: "0px",
        width: "24px",
        height: "24px",
        borderRadius: "999px",
        pointerEvents: "none",
        zIndex: "999999",
        transform: "translate(-100px,-100px)",
        boxShadow: "0 0 18px 6px rgba(0, 196, 255, 0.6)",
        backdropFilter: "blur(2px)",
      });

      let tx = 0, ty = 0;
      let fx = 0, fy = 0;
      let raf = 0;

      const onMove = (e: MouseEvent) => {
        tx = e.clientX - 12; // center
        ty = e.clientY - 12;
        if (!raf) loop();
      };

      const loop = () => {
        fx += (tx - fx) * 0.18;
        fy += (ty - fy) * 0.18;
        orbEl!.style.transform = `translate(${fx}px, ${fy}px)`;
        raf = requestAnimationFrame(loop);
        if (Math.hypot(tx - fx, ty - fy) < 0.5) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      };

      window.addEventListener("mousemove", onMove);
      return () => {
        window.removeEventListener("mousemove", onMove);
        if (raf) cancelAnimationFrame(raf);
        orbEl?.remove();
      };
    }

    if (cursorId === "starTrailCursor") {
      body.classList.add("cursor-star");
      const container = ensureEl("nova-cursor-stars", {
        position: "fixed",
        left: "0",
        top: "0",
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: "999998",
        overflow: "hidden",
      });

      const makeStar = (x: number, y: number) => {
        const s = document.createElement("span");
        s.className = "nova-star";
        s.style.position = "fixed";
        s.style.left = x + "px";
        s.style.top = y + "px";
        s.style.width = "6px";
        s.style.height = "6px";
        s.style.borderRadius = "999px";
        s.style.background = "white";
        s.style.boxShadow = "0 0 8px 3px rgba(255,255,255,0.8)";
        s.style.opacity = "1";
        s.style.transform = "translate(-50%,-50%)";
        s.style.transition = "transform 500ms ease-out, opacity 500ms ease-out";
        container.appendChild(s);

        // drift & fade
        requestAnimationFrame(() => {
          const dx = (Math.random() - 0.5) * 60;
          const dy = (Math.random() - 0.5) * 60;
          s.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`;
          s.style.opacity = "0";
        });

        // cleanup
        setTimeout(() => s.remove(), 550);
      };

      let lastX = 0, lastY = 0, lastT = 0;
      const onMove = (e: MouseEvent) => {
        const now = performance.now();
        const speed = Math.hypot(e.clientX - lastX, e.clientY - lastY);
        if (now - lastT > 12 || speed > 12) {
          makeStar(e.clientX, e.clientY);
          lastT = now;
          lastX = e.clientX;
          lastY = e.clientY;
        }
      };

      window.addEventListener("mousemove", onMove);
      return () => {
        window.removeEventListener("mousemove", onMove);
        container?.remove();
      };
    }
  }, [cursorId]);
}
