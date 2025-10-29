import React from "react";
import { View, StyleSheet } from "react-native";
import StripeWrapper from "./StripeWrapper";

/**
 * PaymentsLayout: wraps any payments screen in a safe Stripe provider,
 * plus some consistent padding/background styling.
 */
export default function PaymentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <StripeWrapper>
      <View style={styles.container}>{children}</View>
    </StripeWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#010d14",
    padding: 16,
  },
});
