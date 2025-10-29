import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from "react-native";
import { useRouter } from "expo-router";

type Props = {
  label?: string;
  href?: string;           // external URL
  route?: string;          // internal route (e.g. "/donate")
  bottom?: number;
  right?: number;
  onPress?: () => void;
};

export default function FloatingDonateButton({
  label = "Donate",
  href,
  route,
  bottom = 24,
  right = 16,
  onPress,
}: Props) {
  const router = useRouter();

  const handlePress = async () => {
    if (onPress) return onPress();
    if (route) return router.push(route as any);
    if (href) {
      try {
        const can = await Linking.canOpenURL(href);
        if (can) return Linking.openURL(href);
      } catch {}
    }
    // last resort: noop
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom, right }]}>
      <TouchableOpacity accessibilityRole="button" onPress={handlePress} style={styles.btn} activeOpacity={0.9}>
        <View style={styles.glow} />
        <Text style={styles.text}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignSelf: "flex-end",
  },
  btn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#38bdf8",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    ...Platform.select({
      android: { elevation: 6 },
    }),
  },
  glow: {
    position: "absolute",
    inset: -6,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.15)",
  },
  text: {
    color: "#001318",
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
