// app/_lib/dailyQuestEvents.ts
import { DeviceEventEmitter } from "react-native";

export const DAILY_QUEST_PROGRESS_EVENT =
  "nova:daily-quest-progress";

export type DailyQuestProgressEvent =
  | {
      type: "quiz_correct";
      amount?: number;
    }
  | {
      type: "quiz_completed";
      amount?: number;
      scorePercent?: number;
    }
  | {
      type: "quiz_score_80";
      amount?: number;
      scorePercent?: number;
    };

export function emitDailyQuestProgress(
  event: DailyQuestProgressEvent
) {
  try {
    DeviceEventEmitter.emit(
      DAILY_QUEST_PROGRESS_EVENT,
      event
    );
  } catch (error) {
    console.warn(
      "[DailyQuests] progress event failed",
      error
    );
  }
}
