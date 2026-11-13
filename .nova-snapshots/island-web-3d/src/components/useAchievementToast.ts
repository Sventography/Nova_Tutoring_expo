import { Platform, Alert } from "react-native";

// Optional haptics without hard dependency
let Haptics: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Haptics = require("expo-haptics");
} catch {}

/**
 * Tiny cross-platform toast helper:
 * - Android: ToastAndroid
 * - iOS/web: Alert (simple and dependency-free)
 * Also triggers a gentle haptic tap when available.
 */
export type ToastOpts = {
  title?: string;
  message: string;
  emoji?: string;
  haptic?: "light" | "success" | "error" | "none";
  durationMs?: number; // Android only
};

export function useAchievementToast() {
  function vibrate(kind: ToastOpts["haptic"]) {
    if (!Haptics || !kind || kind === "none") return;
    const map: Record<string, () => Promise<void>> = {
      light: () => Haptics.selectionAsync?.() ?? Promise.resolve(),
      success: () => Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success) ?? Promise.resolve(),
      error: () => Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Error) ?? Promise.resolve(),
    };
    (map[kind] || map["light"])().catch(() => {});
  }

  return function showToast(opts: ToastOpts) {
    const { title = "Achievement unlocked!", message, emoji = "🌟", haptic = "success", durationMs = 2000 } = opts;
    vibrate(haptic);

    if (Platform.OS === "android") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ToastAndroid } = require("react-native");
        ToastAndroid.show(`${emoji} ${title}\n${message}`, durationMs >= 3500 ? ToastAndroid.LONG : ToastAndroid.SHORT);
        return;
      } catch {
        // fallback to alert
      }
    }

    // iOS/web fallback
    try {
      Alert.alert(`${emoji} ${title}`, message);
    } catch {
      // final fallback: console
      // eslint-disable-next-line no-console
      console.log(`[Toast] ${emoji} ${title}: ${message}`);
    }
  };
}

export default useAchievementToast;
