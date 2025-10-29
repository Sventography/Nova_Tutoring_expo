import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";

export default function PayButton({ onPress }: { onPress: ()=>void }) {
  return (
    <Pressable onPress={onPress} style={styles.btn}>
      <Text style={styles.txt}>Pay</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: "#00e5ff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  txt: {
    color: "#fff",
    fontWeight: "bold"
  }
});
