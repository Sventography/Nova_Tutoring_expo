import React from "react";
import { TouchableOpacity, Text, View, ActivityIndicator } from "react-native";
import { Linking } from "react-native";

type Props = {
  url?: string;
  label?: string;
  disabled?: boolean;
  onComplete?: () => void;
};

export default function StripePay({ url, label = "Checkout", disabled, onComplete }: Props) {
  const [loading, setLoading] = React.useState(false);
  const press = async () => {
    if (!url) return;
    setLoading(true);
    try { await Linking.openURL(url); } catch {}
    setLoading(false);
    onComplete?.();
  };
  const isDisabled = disabled || !url || loading;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={press}
      disabled={isDisabled}
      style={{
        opacity: isDisabled ? 0.6 : 1,
        backgroundColor: "#0ea5e9",
        borderColor: "#38bdf8",
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 999,
        alignSelf: "flex-start"
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {loading ? <ActivityIndicator /> : null}
        <Text style={{ color: "#001318", fontWeight: "800", letterSpacing: 0.5 }}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}
