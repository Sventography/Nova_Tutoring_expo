import { DeviceEventEmitter } from "react-native";
import { quizFinished, unlock } from "./achievements-bridge";

console.log("🔥 Test achievement bridge started");

// fire a fake quiz result (20/20 correct)
DeviceEventEmitter.emit("achievement://quiz-finished", {
  correct: 20,
  durationSec: 300,
});

// fire a direct unlock
DeviceEventEmitter.emit("achievement://unlock", {
  id: "quiz_10",
  label: "Answered 10 quiz questions",
});

console.log("🔥 Events sent");

