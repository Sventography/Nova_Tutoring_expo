import { DeviceEventEmitter, EmitterSubscription, Alert } from "react-native";

const EVT = "APP_TOAST";

type ToastMsg = { id: string; msg: string; type?: "info" | "success" | "error" };

export function onToast(handler: (t: ToastMsg) => void): () => void {
  const sub: EmitterSubscription = DeviceEventEmitter.addListener(EVT, handler as any);
  return () => sub.remove();
}

function emit(msg: string, type: ToastMsg["type"] = "info") {
  const t: ToastMsg = { id: `${Date.now()}-${Math.random()}`, msg, type };
  try {
    DeviceEventEmitter.emit(EVT, t);
  } catch {
    Alert.alert(type === "success" ? "Success" : "Notice", msg);
  }
}

export function showToast(msg: string) { emit(msg, "info"); }
export function successToast(msg: string) { emit(msg, "success"); }
export function errorToast(msg: string) { emit(msg, "error"); }
