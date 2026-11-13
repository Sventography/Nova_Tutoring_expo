import { DeviceEventEmitter } from "react-native";

export function brainteaserSolved(totalSolved: number) {
  try { DeviceEventEmitter.emit("brainteasers:solved", { count: totalSolved }); } catch {}
}
export function awardCoins(amount: number, reason = "manual") {
  if (!amount) return;
  try { DeviceEventEmitter.emit("coins:award", { amount, reason }); } catch {}
}
export function unlock(id: string, toast?: string) {
  if (!id) return;
  try { DeviceEventEmitter.emit("unlock", { id }); } catch {}
  if (toast) try { DeviceEventEmitter.emit("celebrate", toast); } catch {}
}
export function quizFinished(score: number, durationSec: number) {
  try { DeviceEventEmitter.emit("quiz:finished", { score, durationSec }); } catch {}
}
export function flashcardsSaved(total: number) {
  try { DeviceEventEmitter.emit("collections:saved", { total }); } catch {}
}
export function flashcardsCreated(total: number) {
  try { DeviceEventEmitter.emit("flashcards:created", { total }); } catch {}
}
export function streakUpdate(days: number, today: boolean) {
  try { DeviceEventEmitter.emit("streak:update", { days, today }); } catch {}
}
