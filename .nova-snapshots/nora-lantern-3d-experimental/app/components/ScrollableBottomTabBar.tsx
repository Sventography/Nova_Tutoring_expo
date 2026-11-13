import React from "react";
import { ScrollView, View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

export default function ScrollableBottomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  // Show every real tab unless the screen sets options.href === null
  const routes = state.routes.filter(
    (r) => descriptors[r.key]?.options?.href !== null
  );

  return (
    <View style={S.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.scroll}>
        {routes.map((route, index) => {
          const { options } = descriptors[route.key] || {};
          const isFocused = state.index === index;

          // Robust label resolution (stringify if React node/function)
          let rawLabel: any =
            options?.tabBarLabel ?? options?.title ?? route.name ?? "";
          if (typeof rawLabel === "function") rawLabel = rawLabel({ focused: isFocused, color: "#fff", position: "below-icon" } as any);
          const label = typeof rawLabel === "string" ? rawLabel : String(rawLabel);

          // Robust icon resolution (fallback to "ellipse")
          let iconName: any = "ellipse";
          if (typeof options?.tabBarIcon === "function") {
            const el = options.tabBarIcon({ focused: isFocused, color: "#fff", size: 22 });
            // If they return an <Ionicons name="..."/>, read .props.name safely
            if (el && typeof el === "object" && (el as any).props?.name) {
              iconName = (el as any).props.name;
            }
          }

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={[S.tab, isFocused && S.activeTab]}>
              <Ionicons name={iconName as any} size={22} color={isFocused ? "#0ff" : "#aaa"} />
              <Text style={[S.label, isFocused && S.activeLabel]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const S = StyleSheet.create({
  container: { backgroundColor: "#111", borderTopWidth: 1, borderTopColor: "#333" },
  scroll: { paddingVertical: 8, paddingHorizontal: 4, alignItems: "center" },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 4,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  activeTab: { backgroundColor: "#0af" },
  label: { marginTop: 2, fontSize: 12, color: "#aaa", fontWeight: "600", textAlign: "center" },
  activeLabel: { color: "#fff" },
});
