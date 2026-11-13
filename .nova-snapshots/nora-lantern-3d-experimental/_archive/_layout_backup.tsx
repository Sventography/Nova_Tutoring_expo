import React from "react";
import { Stack } from "expo-router";
import { ThemeProvider } from "../context/ThemeContext";
import { WalletProvider } from "../context/WalletContext";
import { NotifProvider } from "../context/NotifContext";
import { ToastProvider } from "react-native-toast-notifications";

export default function Layout() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <NotifProvider>
          <ToastProvider>
            <Stack />
          </ToastProvider>
        </NotifProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
