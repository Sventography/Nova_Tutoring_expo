// app/utils/toast.ts
// Central toast event bus so legacy helpers, ToastProvider, and ToastHost
// can all talk to each other safely.

export type ToastPayload =
  | string
  | {
      id?: number | string;
      msg?: string; // legacy single-string field
      message?: string; // newer field
      title?: string;
      icon?: string;
      duration?: number;
      type?: "success" | "error" | "info";
    };

type Listener = (t: ToastPayload) => void;

// The current "main" handler, usually provided by ToastProvider via registerToast()
let mainHandler: ((t: ToastPayload) => void) | null = null;

// Additional listeners (e.g. ToastHost)
const listeners = new Set<Listener>();

/**
 * Called by ToastProvider to become the primary toast handler.
 * It will receive anything sent via showToast().
 */
export function registerToast(fn: (t: ToastPayload) => void) {
  mainHandler = fn;
}

/**
 * Legacy/global helper: show a toast from anywhere.
 * - If a mainHandler (ToastProvider) is registered, it will be called.
 * - All onToast() listeners (e.g. ToastHost) also receive the payload.
 */
export function showToast(payload: ToastPayload) {
  try {
    if (mainHandler) {
      mainHandler(payload);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[toast] mainHandler error", err);
  }

  // Fan-out to additional listeners
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[toast] listener error", err);
    }
  });
}

/**
 * Subscribe to toast events. Used by ToastHost.
 * Returns an unsubscribe function.
 */
export function onToast(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}