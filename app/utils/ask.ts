// app/utils/ask.ts
import Constants from "expo-constants";

export type AskResponse = {
  ok: boolean;
  answer?: string;
  error?: string;
  model?: string;
};

type ExtraConfig = {
  EXPO_PUBLIC_BACKEND_URL?: string;
  backendBase?: string;
  [key: string]: any;
};

function stripTrailingSlashes(s: string): string {
  return s.replace(/\/+$/g, "");
}

// Read from app.config.js -> extra
const extra = (Constants.expoConfig?.extra || {}) as ExtraConfig;

// Prefer explicit config from extra, then env
const RAW_BACKEND_URL =
  extra.backendBase ||
  extra.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "";

// FINAL base URL for all backend calls
export const BACKEND_URL = stripTrailingSlashes(
  RAW_BACKEND_URL || "https://nove-tutoring-backend.onrender.com"
);

console.log("[ask] extra.backendBase:", extra.backendBase);
console.log("[ask] extra.EXPO_PUBLIC_BACKEND_URL:", extra.EXPO_PUBLIC_BACKEND_URL);
console.log("[ask] process.env.EXPO_PUBLIC_BACKEND_URL:", process.env.EXPO_PUBLIC_BACKEND_URL);
console.log("[ask] Using BACKEND_URL:", BACKEND_URL);

if (!BACKEND_URL) {
  console.warn(
    "[ask] BACKEND_URL is empty. Check EXPO_PUBLIC_BACKEND_URL / app.config.js extra."
  );
}

/**
 * Call Nova Ask backend. The OpenAI key lives ONLY on the server.
 */
export async function askNova(
  question: string,
  userId?: string | null
): Promise<AskResponse> {
  if (!BACKEND_URL) {
    return {
      ok: false,
      error:
        "Ask backend is not configured. Please set EXPO_PUBLIC_BACKEND_URL in your env.",
    };
  }

  const trimmed = (question || "").trim();
  if (!trimmed) {
    return { ok: false, error: "Please enter a question first." };
  }

  const url = `${BACKEND_URL}/api/ask`;
  const payload = {
    question: trimmed,
    user_id: userId ?? null, // match backend expectation
  };

  console.log("[ask] POST", url, JSON.stringify(payload));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(
        "[ask] backend responded with error:",
        res.status,
        text || res.statusText
      );
      return {
        ok: false,
        error: `Ask backend error: ${res.status}`,
      };
    }

    const data = (await res.json()) as AskResponse;

    // Normalize a little in case backend shape changes
    if (!data.ok && !data.error) {
      return { ok: false, error: "Unknown Ask backend error." };
    }
    if (data.ok && !data.answer && data.error) {
      // weird state, treat as error
      return { ok: false, error: data.error };
    }

    return data;
  } catch (e: any) {
    console.warn("[ask] network/other error:", e);
    return {
      ok: false,
      error:
        e?.message ||
        "Network error contacting Ask server. Please try again in a moment.",
    };
  }
}
