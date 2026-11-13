import { DeviceEventEmitter } from "react-native";
import {
  awardCoins,
  brainteaserSolved,
  unlock,
  quizFinished,
  flashcardsSaved,
  flashcardsCreated,
  streakUpdate,
} from "./achievements-api";

if (__DEV__ && typeof globalThis !== "undefined") {
  (globalThis as any).emitRN = (type: string, payload?: any) => {
    try { DeviceEventEmitter.emit(type, payload); } catch (e) { console.warn("emitRN failed", e); }
  };
  (globalThis as any).awardCoins = awardCoins;
  (globalThis as any).brainteaserSolved = brainteaserSolved;
  (globalThis as any).unlock = unlock;
  (globalThis as any).quizFinished = quizFinished;
  (globalThis as any).flashcardsSaved = flashcardsSaved;
  (globalThis as any).flashcardsCreated = flashcardsCreated;
  (globalThis as any).streakUpdate = streakUpdate;
}
