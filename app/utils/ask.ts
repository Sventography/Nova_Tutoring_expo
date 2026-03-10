// app/utils/ask.ts
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AskResponse = {
  ok: boolean;
  answer?: string;
  error?: string;
  model?: string;
  coins_awarded?: number;
  // memory meta from backend
  ask_memory_tier?: string | null;
  ask_memory_limit?: number | null;
};

type AskHistoryItem = {
  role: "user" | "assistant" | "system";
  content: string;
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
console.log(
  "[ask] extra.EXPO_PUBLIC_BACKEND_URL:",
  extra.EXPO_PUBLIC_BACKEND_URL
);
console.log(
  "[ask] process.env.EXPO_PUBLIC_BACKEND_URL:",
  process.env.EXPO_PUBLIC_BACKEND_URL
);
console.log("[ask] Using BACKEND_URL:", BACKEND_URL);

if (!BACKEND_URL) {
  console.warn(
    "[ask] BACKEND_URL is empty. Check EXPO_PUBLIC_BACKEND_URL / app.config.js extra."
  );
}

/**
 * Call Nova Ask backend. The OpenAI key lives ONLY on the server.
 *
 * - `userId` is optional; when present we send it as `user_id` in the body.
 * - `history` is optional; when present we send it as [{role, content}, ...].
 */
export async function askNova(
  question: string,
  opts?: {
    userId?: string | null;
    history?: AskHistoryItem[] | null;
  }
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

  const payload: any = {
    question: trimmed,
  };

  if (opts?.userId) {
    payload.user_id = opts.userId;
  }

  if (opts?.history && Array.isArray(opts.history) && opts.history.length > 0) {
    payload.history = opts.history.map((h) => ({
      role: h.role,
      content: h.content,
    }));
  }

  console.log("[ask] POST", url, JSON.stringify(payload));

  // Build headers and, if available, attach Supabase JWT for the server
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const jwt = await AsyncStorage.getItem("auth.supabase.jwt");
    if (jwt) {
      headers["Authorization"] = `Bearer ${jwt}`;
      console.log("[ask] attached Supabase JWT to Authorization header");
    } else {
      console.log("[ask] no Supabase JWT found in AsyncStorage");
    }
  } catch (e) {
    console.warn(
      "[ask] failed to read Supabase JWT from AsyncStorage:",
      e
    );
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
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

    const raw = (await res.json()) as any;
    console.log("[ask] raw response:", raw);

    const error =
      typeof raw?.error === "string" ? (raw.error as string) : undefined;
    const answer =
      typeof raw?.answer === "string" ? (raw.answer as string) : undefined;
    const model =
      typeof raw?.model === "string" ? (raw.model as string) : undefined;

    const coins_awarded =
      typeof raw?.coins_awarded === "number"
        ? (raw.coins_awarded as number)
        : undefined;

    const ask_memory_tier =
      (raw?.ask_memory_tier as string | null | undefined) ?? null;
    const ask_memory_limit =
      typeof raw?.ask_memory_limit === "number"
        ? (raw.ask_memory_limit as number)
        : null;

    const ok = !!answer && !error;

    if (!ok && !error) {
      return {
        ok: false,
        error: "Unknown Ask backend error.",
        answer,
        model,
        coins_awarded,
        ask_memory_tier,
        ask_memory_limit,
      };
    }

    return {
      ok,
      answer,
      error,
      model,
      coins_awarded,
      ask_memory_tier,
      ask_memory_limit,
    };
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