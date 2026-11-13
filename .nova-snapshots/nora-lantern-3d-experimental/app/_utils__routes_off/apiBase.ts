// app/utils/apiBase.ts
// Central API config + tiny fetch wrapper (typed, resilient).
import { Platform } from "react-native";
let Constants: any = null;
try {
  Constants = require("expo-constants");
} catch {}

/** Read EXPO_PUBLIC_* first, then app.json extra, with a safe fallback */
function readEnv(key: string, fallback?: string): string {
  const prefixed = (process.env as any)?.[`EXPO_PUBLIC_${key}`];
  const extra =
    Constants?.expoConfig?.extra?.[key] ??
    Constants?.manifest?.extra?.[key];
  return (prefixed ?? extra ?? fallback ?? "").toString();
}

// You were testing a LAN server on :5055 — keep that as a friendly default.
const DEFAULT_LAN = "http://192.168.1.45:5055";
const DEFAULT_LOCAL = "http://localhost:5055";

// Determine base URL once, trim trailing slashes.
export const API_BASE = (readEnv("API_BASE") ||
  readEnv("API_URL") ||
  (Platform.OS === "web" ? DEFAULT_LOCAL : DEFAULT_LAN)
).replace(/\/+$/, "");

/** Build a full URL from a path and optional query params */
export function apiUrl(path: string, params?: Record<string, any>) {
  const base = API_BASE.endsWith("/") ? API_BASE : API_BASE + "/";
  const cleanPath = (path || "").replace(/^\/+/, "");
  const url = new URL(cleanPath, base);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    });
  }
  return url.toString();
}

type FetchOptions = RequestInit & {
  json?: any;          // if provided, body = JSON.stringify(json) and default method=POST
  timeoutMs?: number;  // abort after ms
  headers?: Record<string, string>;
};

/** Fetch JSON/text with sane defaults + timeout + good errors */
export async function fetchJson<T = any>(
  path: string,
  opts: FetchOptions = {}
): Promise<T> {
  const { json, timeoutMs = 30000, headers = {}, ...rest } = opts;

  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;

  const method = json !== undefined ? (rest.method ?? "POST") : (rest.method ?? "GET");
  const body = json !== undefined ? JSON.stringify(json) : rest.body;

  const res = await fetch(apiUrl(path), {
    ...rest,
    method,
    body,
    headers: {
      Accept: "application/json",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    signal: ctrl?.signal,
  }).catch((e) => {
    throw new Error(`Network error: ${String(e?.message || e)}`);
  });

  if (timer) clearTimeout(timer);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
    (err as any).status = res.status;
    throw err;
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

// Tiny helpers
export const get  = <T = any>(p: string, o?: FetchOptions) => fetchJson<T>(p, { ...(o || {}), method: "GET" });
export const post = <T = any>(p: string, json: any, o?: FetchOptions) =>
  fetchJson<T>(p, { ...(o || {}), json, method: o?.method ?? "POST" });
export const put  = <T = any>(p: string, json: any, o?: FetchOptions) =>
  fetchJson<T>(p, { ...(o || {}), json, method: "PUT" });
export const del  = <T = any>(p: string, o?: FetchOptions) =>
  fetchJson<T>(p, { ...(o || {}), method: "DELETE" });

// Default export for convenience
const API = { API_BASE, apiUrl, fetchJson, get, post, put, del };
export default API;
