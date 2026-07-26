// app/components/ScrollableTabBar.tsx
import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";

type Props = {
  state: any;
  descriptors: any;
  navigation: any;
};

const ALLOWED = new Set([
  "ask",
  "flashcards",
  "quiz",
  "brainteasers",
  "shop",
  "achievements",
  "history",
  "relax",
  "island",
  "account",
  "certificates",
  "collections",
  "purchases",
]);

export default function ScrollableTabBar({
  state,
  descriptors,
  navigation,
}: Props) {
  const items = state.routes.filter(
    (route: any) =>
      ALLOWED.has(route.name) &&
      descriptors[route.key]?.options?.href !== null
  );

  return (
    <View style={S.wrap}>
      <ScrollView
        horizontal
        bounces
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.row}
      >
        {items.map((route: any) => {
          const isFocused =
            state.index ===
            state.routes.indexOf(route);

          const { options } =
            descriptors[route.key] || {};

          const rawLabel =
            options?.tabBarLabel ??
            options?.title ??
            route.name ??
            "";

          const label =
            typeof rawLabel === "string"
              ? rawLabel.toUpperCase()
              : String(rawLabel);

          const activeColor = "#00e5ff";
          const inactiveColor =
            "rgba(0,229,255,0.7)";

          const color = isFocused
            ? activeColor
            : inactiveColor;

          const onPress = async () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (
              !isFocused &&
              !event.defaultPrevented
            ) {
              try {
                await Haptics.selectionAsync();
              } catch {}

              navigation.navigate(route.name);
            }
          };

          const icon =
            typeof options?.tabBarIcon ===
            "function"
              ? options.tabBarIcon({
                  focused: isFocused,
                  color,
                  size: 22,
                })
              : null;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[
                S.item,
                isFocused && S.itemActive,
              ]}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityState={{
                selected: isFocused,
              }}
              accessibilityLabel={`${label} tab`}
            >
              <View style={S.iconBox}>
                {icon}
              </View>

              <Text
                style={[
                  S.label,
                  { color },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>

              {isFocused ? (
                <View style={S.underline} />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const S = StyleSheet.create({
  wrap: {
    backgroundColor: "#000",
    paddingVertical: 6,
  },
  row: {
    paddingHorizontal: 8,
    alignItems: "center",
  },
  item: {
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 10,
  },
  itemActive: {
    shadowColor: "#00e5ff",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    borderWidth: 1,
    borderColor:
      "rgba(0,229,255,0.5)",
    backgroundColor:
      "rgba(0,229,255,0.06)",
  },
  iconBox: {
    height: 24,
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  underline: {
    marginTop: 6,
    height: 2,
    width: 36,
    borderRadius: 2,
    backgroundColor: "#00e5ff",
  },
});