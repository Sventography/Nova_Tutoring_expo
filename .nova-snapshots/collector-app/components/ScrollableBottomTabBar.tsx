import * as React from "react";
import { ScrollView, View, Pressable, Text, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export default function ScrollableBottomTabBar(props: BottomTabBarProps) {
  const { state, descriptors, navigation } = props;

  return (
    <View style={S.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.row}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          // Hide routes with href:null (expo-router) or explicit tabBarStyle: { display: 'none' }
          // If you’re hiding any, keep that logic here. Otherwise, we show all routes.
          const isFocused = state.index === index;

          const label =
            options.tabBarLabel !== undefined
              ? (options.tabBarLabel as string)
              : options.title !== undefined
              ? options.title
              : (route.name as string);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const Icon = options.tabBarIcon as
            | ((p: { color: string; size: number; focused: boolean }) => React.ReactNode)
            | undefined;

          const color = isFocused ? "#00e5ff" : "#98c7d1";

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[S.item, isFocused && S.itemActive]}
            >
              <View style={S.iconWrap}>
                {Icon ? Icon({ color, size: 22, focused: isFocused }) : null}
              </View>
              <Text style={[S.label, { color }]} numberOfLines={1}>
                {String(label).toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: {
    backgroundColor: "#06121a",
    borderTopColor: "rgba(0,229,255,0.2)",
    borderTopWidth: 1,
    paddingVertical: 6,
  },
  row: {
    paddingHorizontal: 8,
    gap: 8,
    alignItems: "center",
  },
  item: {
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  itemActive: {
    backgroundColor: "rgba(0,229,255,0.08)",
  },
  iconWrap: { marginBottom: 2 },
  label: { fontSize: 11, fontWeight: "700" },
});
