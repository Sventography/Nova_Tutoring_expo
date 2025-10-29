import React from "react";
import { View, Text, Button, Alert } from "react-native";
import { CardField, useConfirmPayment } from "@stripe/stripe-react-native";

type Props = { clientSecret: string; onSuccess?: () => void };

export default function StripePay({ clientSecret, onSuccess }: Props) {
  const { confirmPayment, loading } = useConfirmPayment();
  const [complete, setComplete] = React.useState(false);

  const pay = async () => {
    if (!complete) {
      Alert.alert("Card incomplete");
      return;
    }
    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      paymentMethodType: "Card",
    });
    if (error) {
      Alert.alert("Payment error", error.message ?? "Unknown error");
      return;
    }
    if (paymentIntent?.status === "Succeeded") {
      onSuccess?.();
      Alert.alert("Success", "Payment complete!");
    }
  };

  return (
    <View style={{ gap: 12, padding: 12 }}>
      <Text>Enter your card</Text>
      <CardField
        postalCodeEnabled
        onCardChange={(d) => setComplete(!!d?.complete)}
        style={{ width: "100%", height: 50 }}
      />
      <Button title={loading ? "Processing..." : "Pay"} onPress={pay} disabled={loading || !complete} />
    </View>
  );
}
