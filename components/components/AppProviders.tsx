import React from "react";
import { ToastProvider } from "react-native-toast-notifications";
import { ViewStyle } from "react-native";

type Props = {
  children: React.ReactNode;
};

export default function AppProviders({ children }: Props) {
  return (
    <ToastProvider
      placement="bottom"
      duration={2500}
      animationType="slide-in"
      offset={70}
      successColor="#6DF2C1"
      dangerColor="#FF6B6B"
      warningColor="#FFD166"
      normalColor="#A594F9"
      textStyle={
        {
          fontSize: 16,
          fontWeight: "600",
        } as ViewStyle
      }
    >
      {children}
    </ToastProvider>
  );
}
