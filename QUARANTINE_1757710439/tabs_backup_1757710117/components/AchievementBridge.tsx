import React, { useEffect } from "react";
import { AppState } from "react-native";
import { recordEvent } from "../../_lib/achievements";
export default function AchievementBridge() {
  useEffect(() => {
    recordEvent("heartbeat");
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") recordEvent("heartbeat");
    });
    return () => {
      sub.remove();
    };
  }, []);
  return null;
}
