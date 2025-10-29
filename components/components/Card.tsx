import React from "react";
import { View, ViewProps } from "react-native";
export default function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: "rgba(255,255,255,0.9)",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.1)",
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
