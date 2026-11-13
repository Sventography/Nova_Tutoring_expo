import React from "react";
import { View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

function useTheme() {
  return {
    bg: "#0b0f14",
    active: "#ff7eb9",
    inactive: "#aaa",
  };
}

export default function GlowTabBar({ state, descriptors, navigation }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: "row",
        paddingBottom: insets.bottom + 4,
        paddingTop: 6,
        backgroundColor: c.bg,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.1)",
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          Haptics.selectionAsync();
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const iconName =
          label === "ask"
            ? "chatbubbles"
            : label === "history"
              ? "time"
              : label === "collections"
                ? "albums"
                : label === "flashcards"
                  ? "layers"
                  : label === "relax"
                    ? "heart"
                    : label === "shop"
                      ? "cart"
                      : label === "achievements"
                        ? "trophy"
                        : label === "account"
                          ? "person"
                          : "ellipse";

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 6,
            }}
          >
            <Ionicons
              name={iconName as any}
              size={24}
              color={isFocused ? c.active : c.inactive}
              style={{
                textShadowColor: isFocused ? c.active : "transparent",
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: isFocused ? 12 : 0,
              }}
            />
            <Text
              style={{
                color: isFocused ? c.active : c.inactive,
                fontSize: 12,
                fontWeight: isFocused ? "700" : "500",
              }}
            >
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
