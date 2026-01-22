import { DeviceEventEmitter } from "react-native";
if (__DEV__) {
  setTimeout(()=>{ 
    try{ DeviceEventEmitter.emit("unlock", { id: "quiz_score_80" }); }catch{}
    try{ DeviceEventEmitter.emit("celebrate", "🔧 Achievements wired!"); }catch{}
  }, 1200);
}
