// app/_lib/api.ts
import { getApiBase, joinUrl } from "../_config/apiBase";

export const API_BASE = getApiBase();

/** in-memory auth token (set after login/register) */
let AUTH_TOKEN: string | null = null;
export function setAuthToken(token: string | null) {
  AUTH_TOKEN = token || null;
}

/** small timeout wrapper so requests can't hang forever */
function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); })
     .catch(e => { clearTimeout(t); reject(e); });
  });
}

/** minimal retry helper for transient failures */
async function fetchRetry(input: RequestInfo, init: RequestInit, tries = 2, delayMs = 600): Promise<Response> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(input, init);
      return r;
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise(res => setTimeout(res, delayMs));
    }
  }
  throw lastErr;
}

function jsonTryParse(text: string) {
  try { return JSON.parse(text); } catch { return text; }
}

async function handle(resp: Response) {
  const text = await resp.text();
  const data = jsonTryParse(text);
  if (!resp.ok) {
    const msg =
      (data && typeof data === "object" && (data as any).error) ? (data as any).error :
      (typeof data === "string" ? data : `HTTP ${resp.status}`);
    throw new Error(msg);
  }
  return data;
}

function authHeaders() {
  return AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {};
}

/** core request helpers */
export async function apiGet(path: string, init?: RequestInit) {
  const url = joinUrl(API_BASE, path);
  const resp = await withTimeout(fetchRetry(url, {
    method: "GET",
    headers: { Accept: "application/json", ...authHeaders() },
    ...init,
  }), 15000);
  return handle(resp);
}

export async function apiPost(path: string, body?: any, init?: RequestInit) {
  const url = joinUrl(API_BASE, path);
  const resp = await withTimeout(fetchRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
    body: body != null ? JSON.stringify(body) : undefined,
    ...init,
  }), 20000);
  return handle(resp);
}

export async function apiPatch(path: string, body?: any, init?: RequestInit) {
  const url = joinUrl(API_BASE, path);
  const resp = await withTimeout(fetchRetry(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
    body: body != null ? JSON.stringify(body) : undefined,
    ...init,
  }), 20000);
  return handle(resp);
}

/* ============================
   Public endpoints used in app
   ============================ */

/* Health */
export const ping = () => apiGet("/api/ping");
export const health = () => apiGet("/health");

/* Ask + Teasers */
export async function ask(question: string) {
  const q = question?.trim();
  if (!q) throw new Error("Question is empty");
  return apiPost("/api/ask", { question: q });
}

export async function checkTeaser(teaser: string, answer: string) {
  const t = teaser?.trim(), a = answer?.trim();
  if (!t || !a) throw new Error("Missing teaser or answer");
  return apiPost("/api/teasers/check", { teaser: t, answer: a });
}

/* Auth */
export async function register(email: string, username: string, password: string, confirm: string) {
  const r = await apiPost("/api/auth/register", { email, username, password, confirm });
  setAuthToken((r as any)?.token || null);
  return r;
}

export async function login(email: string, password: string) {
  const r = await apiPost("/api/auth/login", { email, password });
  setAuthToken((r as any)?.token || null);
  return r;
}

export const forgot = (email: string) => apiPost("/api/auth/forgot", { email });
export const resetPassword = (token: string, password: string, confirm: string) =>
  apiPost("/api/auth/reset", { token, password, confirm });

export const me = () => apiGet("/api/me");
export const updateMe = (patch: { username?: string; avatar_url?: string }) =>
  apiPatch("/api/me", patch);

/* Shop */
export const shopList = () => apiGet("/api/shop/list");
export const shopPurchase = (item_id: string) => apiPost("/api/shop/purchase", { item_id });
export const shopPurchases = () => apiGet("/api/shop/purchases");
export const shopReceipt = (pid: number) => apiGet(`/api/shop/receipt/${pid}`);

/* Avatar upload (multipart). Do NOT set Content-Type manually. */
export async function uploadAvatar(file: { uri: string; name: string; type: string }) {
  const form = new FormData();
  // @ts-ignore — React Native FormData file shape
  form.append("file", file as any);
  const url = joinUrl(API_BASE, "/api/upload/avatar");
  const resp = await withTimeout(fetchRetry(url, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  }), 20000);
  return handle(resp);
}
