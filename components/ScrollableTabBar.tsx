import React from "react";
import { ScrollView, View, Pressable, Text } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export default function ScrollableTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: "rgba(0,229,255,0.12)", backgroundColor: "#06111a" }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            (options.tabBarLabel as string) ??
            (options.title as string) ??
            route.name;
          const Icon = options.tabBarIcon;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={{ alignItems: "center", justifyContent: "center", paddingVertical: 8, paddingHorizontal: 10, minWidth: 88 }}
            >
              <View style={{ marginBottom: 2 }}>
                {Icon ? <Icon color={isFocused ? "#00e5ff" : "#82cfe0"} size={22} focused={isFocused} /> : null}
              </View>
              <Text style={{ color: isFocused ? "#e6f7fb" : "#8fb9c7", fontSize: 12, fontWeight: isFocused ? "800" : "600", textTransform: "capitalize" }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
