import React, { createContext, useContext, useCallback } from "react";
import { Platform, Alert, ToastAndroid } from "react-native";

type NotifAPI = { notify: (msg: string, title?: string) => void };
const NotifCtx = createContext<NotifAPI>({ notify: () => {} });
export const useNotif = () => useContext(NotifCtx);

export default function NotifProvider({ children }: { children: React.ReactNode }) {
  const notify = useCallback((msg: string, title?: string) => {
    if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert(title ?? "Notice", msg);
  }, []);
  return <NotifCtx.Provider value={{ notify }}>{children}</NotifCtx.Provider>;
}
