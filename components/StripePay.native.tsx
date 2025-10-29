import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { CardField, useStripe } from "@stripe/stripe-react-native";

export default function StripePay() {
  const { confirmPayment } = useStripe();
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // hit your Flask backend to create PaymentIntent
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 500 }), // $5.00 example
      });
      const { clientSecret } = await res.json();

      const { error } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
      });
      if (error) console.warn("Payment error:", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.box}>
      <CardField postalCodeEnabled style={{ height: 48, marginVertical: 12 }} />
      <Pressable onPress={pay} disabled={busy} style={styles.btn}>
        <Text style={styles.btnText}>{busy ? "Processing..." : "Pay $5.00"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: "90%", gap: 12 },
  btn: { padding: 12, borderRadius: 8, backgroundColor: "#1e88e5", alignItems: "center" },
  btnText: { color: "white", fontWeight: "700" },
});
