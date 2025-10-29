// app/_lib/haptics.ts
// Unified, resilient haptics helpers + a convenient hook.
// - Uses expo-haptics if available
// - Silently no-ops on web / unsupported devices
// - Safe across Expo SDK versions (optional chaining + fallbacks)

import * as Haptics from "expo-haptics";

// Shortcuts to enum bags (may be undefined on very old SDKs)
const Impact = (Haptics as any).ImpactFeedbackStyle ?? {};
const Notify = (Haptics as any).NotificationFeedbackType ?? {};

// ---- low-level safe calls --------------------------------------------------

/** Generic safe impact */
export async function impact(
  style: number | (typeof Haptics)["ImpactFeedbackStyle"] =
    // default Medium; fallback to 2 for very old SDKs
    (Impact.Medium ?? 2)
) {
  try {
    const fn = (Haptics as any).impactAsync;
    if (typeof fn === "function") await fn(style);
  } catch {}
}

/** Selection (soft tick) */
export async function selection() {
  try {
    const fn = (Haptics as any).selectionAsync;
    if (typeof fn === "function") await fn();
  } catch {}
}

/** Notification types */
export async function success() {
  try {
    const fn = (Haptics as any).notificationAsync;
    if (typeof fn === "function") await fn(Notify.Success ?? 1);
  } catch {}
}

export async function warning() {
  try {
    const fn = (Haptics as any).notificationAsync;
    if (typeof fn === "function") await fn(Notify.Warning ?? 2);
  } catch {}
}

export async function error() {
  try {
    const fn = (Haptics as any).notificationAsync;
    if (typeof fn === "function") await fn(Notify.Error ?? 3);
  } catch {}
}

// Friendly aliases for common impacts
export async function light()  { await impact(Impact.Light  ?? 1); }
export async function medium() { await impact(Impact.Medium ?? 2); }
export async function heavy()  { await impact(Impact.Heavy  ?? 3); }

// ---- your hook, enhanced with safety --------------------------------------

/**
 * useHaptics()
 * Returns ready-to-use haptic functions for components.
 * All functions are safe to call on any platform.
 */
export function useHaptics() {
  return {
    selection,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    impact,
  };
}

// ---- default export (so both import styles work) ---------------------------

export default {
  useHaptics,
  selection,
  light,
  medium,
  heavy,
  success,
  warning,
  error,
  impact,
};
