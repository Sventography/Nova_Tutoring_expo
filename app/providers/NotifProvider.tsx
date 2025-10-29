import React, { createContext, useContext, useCallback } from "react";
import { Platform, ToastAndroid, Alert } from "react-native";

type NotifApi = {
  show: (msg: string) => void;
};

const NotifCtx = createContext<NotifApi | null>(null);

export function NotifProvider({ children }: { children: React.ReactNode }) {
  const show = useCallback((msg: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert("Nova", msg);
    }
  }, []);
  return <NotifCtx.Provider value={{ show }}>{children}</NotifCtx.Provider>;
}

export const useNotif = () => {
  const ctx = useContext(NotifCtx);
  if (!ctx) throw new Error("useNotif must be used within NotifProvider");
  return ctx;
};
