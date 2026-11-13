import React from "react";
import { Modal, View, Text, StyleSheet } from "react-native";

export default function FlashModal({
  visible,
  text,
}: {
  visible: boolean;
  text: string;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.text}>{text}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    padding: 20,
    backgroundColor: "#111",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#0ff",
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0ff",
    textAlign: "center",
  },
});
