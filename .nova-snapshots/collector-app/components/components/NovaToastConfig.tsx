import React from "react";
import { BaseToast, ErrorToast } from "react-native-toast-message";
import { View, Text } from "react-native";

const textStyle = {
  fontSize: 15,
  color: "#ffffff",
  fontWeight: "600",
};

const containerStyle = {
  borderRadius: 16,
  paddingHorizontal: 20,
  paddingVertical: 12,
  backgroundColor: "linear-gradient(90deg, #00ffff, #0066ff)",
  borderLeftWidth: 0,
  shadowColor: "#00ccff",
  shadowOpacity: 0.8,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
};

export const NovaToastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={[containerStyle]}
      contentContainerStyle={{ paddingHorizontal: 12 }}
      text1Style={textStyle}
      text2Style={textStyle}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={[containerStyle, { backgroundColor: "#ff0066" }]}
      text1Style={textStyle}
      text2Style={textStyle}
    />
  ),
};
