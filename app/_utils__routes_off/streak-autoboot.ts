/**
 * Day-change detector:
 * - When the tab becomes visible and the calendar day has changed,
 *   dispatch a 'nova:new-day' event on window.
 * - If a legacy global updateUser function exists, call it safely.
 */

function todayKey(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

let lastDay = todayKey();

if (typeof document !== "undefined" && typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const now = todayKey();
      if (now !== lastDay) {
        lastDay = now;
        // Notify listeners in-app (optional)
        try {
          window.dispatchEvent(
            new CustomEvent("nova:new-day", { detail: { day: now } })
          );
        } catch {}
        // Legacy: call global updateUser if present (safe no-op otherwise)
        const anyWin = window as any;
        if (typeof anyWin.updateUser === "function") {
          try {
            anyWin.updateUser({ lastActiveDay: now });
          } catch {}
        }
      }
    }
  });
}

export {}; // treat as a module
