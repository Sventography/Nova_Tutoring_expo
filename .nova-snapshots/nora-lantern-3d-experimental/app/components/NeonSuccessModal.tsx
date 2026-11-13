// app/components/NeonSuccessModal.tsx
import React from "react";
import { Modal, View, Text } from "react-native";

export default function NeonSuccessModal({
  visible,
  message = "Order placed successfully!",
}: {
  visible: boolean;
  message?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            paddingVertical: 24,
            paddingHorizontal: 20,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(0,229,255,0.8)",
            backgroundColor: "rgba(0,229,255,0.10)",
            shadowColor: "#00E5FF",
            shadowRadius: 20,
            shadowOpacity: 0.8,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <Text
            style={{
              color: "#E6FEFF",
              fontSize: 18,
              fontWeight: "800",
              textAlign: "center",
              textShadowColor: "rgba(0,229,255,0.9)",
              textShadowRadius: 14,
            }}
          >
            {message}
          </Text>
        </View>
      </View>
    </Modal>
  );
}
