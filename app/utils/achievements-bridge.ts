// app/utils/achievements-bridge.ts
import { DeviceEventEmitter } from "react-native";

/**
 * Fire a global "quiz finished" event that AchievementsContext listens for.
 * @param correct number of correct answers
 * @param durationSec total time spent on the quiz
 */
export function quizFinished(correct: number, durationSec: number) {
  DeviceEventEmitter.emit("achievement://quiz-finished", {
    correct,
    durationSec,
  });
}

/**
 * Unlock a specific achievement by ID.
 * AchievementsContext will listen for this event and update storage + toast.
 */
export function unlock(id: string, label?: string) {
  DeviceEventEmitter.emit("achievement://unlock", {
    id,
    label,
  });
}

