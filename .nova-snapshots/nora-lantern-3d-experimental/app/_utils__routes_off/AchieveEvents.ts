import { DeviceEventEmitter } from "react-native";
type Payload = Record<string, any>;
export const AchieveEvents = {
  emit(name: string, payload?: Payload) {
    try { DeviceEventEmitter.emit(name, payload || {}); } catch {}
  },
  on(name: string, fn: (p: Payload)=>void) {
    const sub = DeviceEventEmitter.addListener(name, fn);
    return () => { try { sub.remove(); } catch {} };
  }
};
