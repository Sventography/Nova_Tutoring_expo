import React from "react";
import { View, StyleSheet, Text } from "react-native";
import StripeWrapper from "@/components/StripeWrapper";
import StripePay from "@/components/StripePay";
import PayButton from "@/components/PayButton";

export default function Payments() {
  return (
    <StripeWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Checkout</Text>
        <StripePay amount={60} onSuccess={() => console.log("Success!")} />
        <View style={{ height: 20 }} />
        <PayButton />
      </View>
    </StripeWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 20,
    color: "#00e5ff",
  },
});
