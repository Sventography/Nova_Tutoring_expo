import React from "react";
import { Tabs } from "expo-router";

export default function GlowTabBar() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: "black" },
        tabBarActiveTintColor: "#00ffff",
        tabBarInactiveTintColor: "#888",
        headerShown: false,
      }}
    />
  );
}
