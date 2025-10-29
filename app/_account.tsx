import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Account() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.txt}>Account tab placeholder 🔐</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  txt: { color: "#0ff", fontSize: 18, fontWeight: "600" }
});
