import React from "react";
import { View, Text, StyleSheet } from "react-native";
import StripeWrapper from "@/components/StripeWrapper";
import PayButton from "@/components/PayButton";

export default function Payments() {
  return (
    <StripeWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Support Nova</Text>
        <PayButton amount={500} label="Donate $5" />
      </View>
    </StripeWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: "#cfe8ef",
    fontWeight: "800",
    fontSize: 20,
    marginBottom: 8,
  },
});
