// app/_lib/analytics.ts
// Safe analytics helpers. If EXPO_PUBLIC_ANALYTICS_URL is missing, we no-op.

const ENDPOINT = process.env.EXPO_PUBLIC_ANALYTICS_URL || "";

function post(path: string, payload: any) {
  if (!ENDPOINT) return Promise.resolve(); // no-op in dev / if unset
  const url = ENDPOINT.replace(/\/$/, "") + path;
  try {
    // Prefer navigator.sendBeacon if available
    // @ts-ignore
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      // @ts-ignore
      navigator.sendBeacon(url, blob);
      return Promise.resolve();
    }
  } catch {}
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }).then(() => {}).catch(() => {});
}

export function trackScreen(name: string) {
  return post("/screen", { name, ts: Date.now() });
}

export function trackEvent(name: string, props?: Record<string, any>) {
  return post("/event", { name, props: props || {}, ts: Date.now() });
}
