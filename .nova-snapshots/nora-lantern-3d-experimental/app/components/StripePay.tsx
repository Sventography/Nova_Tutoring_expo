import React from "react";
import { Pressable, Text, StyleSheet, Alert } from "react-native";

type Props = {
  amount: number;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
};

export default function StripePay({ amount, onSuccess, onError }: Props) {
  const handlePay = async () => {
    try {
      // TODO: replace with real Stripe integration
      console.log("Pretend to pay", amount);
      Alert.alert("Payment success", `Charged $${amount.toFixed(2)}`);
      onSuccess?.();
    } catch (err: any) {
      Alert.alert("Payment failed", err.message);
      onError?.(err);
    }
  };

  return (
    <Pressable style={styles.btn} onPress={handlePay}>
      <Text style={styles.txt}>Pay ${amount.toFixed(2)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: "#00e5ff",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  txt: {
    fontSize: 16,
    fontWeight: "700",
    color: "#06121a",
    textAlign: "center",
  },
});
