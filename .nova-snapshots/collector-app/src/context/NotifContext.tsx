import React from "react";
import { useThemeColors } from "../providers/ThemeBridge";
import {
  ToastProvider,
  useToast as useRNToast,
} from "react-native-toast-notifications";

export function NotifProvider({ children }: { children: React.ReactNode }) {
  const palette = useThemeColors();
  return (
    <ToastProvider
      placement="bottom"
      duration={2500}
      animationType="slide-in"
      animationDuration={250}
      swipeEnabled
      style={{
        backgroundColor: palette.bg,
        borderWidth: 1,
        borderColor: "#0ff",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowColor: "#0ff",
      }}
      textStyle={{
        color: "#A5F4F9",
        fontWeight: "700",
        fontSize: 14,
      }}
    >
      {children}
    </ToastProvider>
  );
}

export const useToast = useRNToast;
