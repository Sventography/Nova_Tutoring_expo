import React, { createContext, useContext } from "react";
import { Alert } from "react-native";

type API = { show:(msg:string)=>void; success:(msg:string)=>void };
const Ctx = createContext<API | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const api: API = {
    show: (m) => Alert.alert("Notice", m),
    success: (m) => Alert.alert("Success", m),
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
