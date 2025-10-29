import * as Haptics from "expo-haptics";

export async function light() {
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
}

export async function medium() {
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
}

export async function heavy() {
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
}

export async function success() {
  try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
}

export async function warning() {
  try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
}

export async function error() {
  try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
}

export default { light, medium, heavy, success, warning, error };
