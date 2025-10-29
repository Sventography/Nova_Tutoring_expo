import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getCheckoutDraft, clearCheckoutDraft } from "./lib/checkout";
import { placeOrderEmail } from "./lib/order";

export default function Billing() {
  const router = useRouter();
  const draft = getCheckoutDraft();
  const [cardName, setCardName] = useState("");
  const [cardNum, setCardNum] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");

  useEffect(() => {
    if (!draft) {
      Alert.alert("Nothing to pay", "Your checkout draft is empty.");
      router.replace("/shop");
    }
  }, [draft]);

  if (!draft) return null;

  const pay = async () => {
    // Place real payment here (Stripe, etc). After success:
    try {
      await placeOrderEmail({
        item: {
          id: draft.item.id,
          name: draft.item.name,
          cashPrice: draft.item.cashPrice,
          method: "cash",
        },
        // Only include address for tangible items
        address: draft.shipping
          ? {
              name: draft.shipping.name,
              address1: draft.shipping.address1,
              address2: draft.shipping.address2,
              city: draft.shipping.city,
              state: draft.shipping.state,
              zip: draft.shipping.zip,
              country: draft.shipping.country,
            }
          : undefined,
      });

      clearCheckoutDraft();
      Alert.alert("Payment complete", "Thanks! We’ll email you a receipt.");
      router.replace("/shop");
    } catch (e) {
      console.warn("billing email failed", e);
      Alert.alert("Payment failed", "Please try again.");
    }
  };

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h1}>Billing</Text>
      <Text style={s.h2}>{draft.item.name}</Text>
      <Text style={s.price}>${draft.item.cashPrice.toFixed(2)}</Text>

      {draft.shipping ? (
        <View style={s.shipBox}>
          <Text style={s.shipTitle}>Ship to</Text>
          <Text style={s.shipLine}>{draft.shipping.name}</Text>
          <Text style={s.shipLine}>{draft.shipping.address1}</Text>
          {!!draft.shipping.address2 && <Text style={s.shipLine}>{draft.shipping.address2}</Text>}
          <Text style={s.shipLine}>
            {draft.shipping.city}, {draft.shipping.state} {draft.shipping.zip}
          </Text>
          {!!draft.shipping.country && <Text style={s.shipLine}>{draft.shipping.country}</Text>}
        </View>
      ) : null}

      <Text style={s.section}>Card details</Text>
      <Field label="Name on card" value={cardName} onChangeText={setCardName} />
      <Field label="Card number" value={cardNum} onChangeText={setCardNum} keyboardType="number-pad" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Expiry (MM/YY)" value={exp} onChangeText={setExp} keyboardType="numbers-and-punctuation" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="CVC" value={cvc} onChangeText={setCvc} keyboardType="number-pad" />
        </View>
      </View>

      <TouchableOpacity style={s.pay} onPress={pay}>
        <Text style={s.payTxt}>Pay ${draft.item.cashPrice.toFixed(2)}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, ...rest }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#7aa8b0" style={s.input} {...rest} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, backgroundColor: "#071018", flexGrow: 1 },
  h1: { color: "#eaffff", fontSize: 26, fontWeight: "900", marginBottom: 4 },
  h2: { color: "#9fe6ff", fontSize: 16, fontWeight: "700", marginBottom: 2 },
  price: { color: "#00e5ff", fontSize: 18, fontWeight: "800", marginBottom: 16 },
  section: { color: "#e0cfff", fontSize: 14, fontWeight: "800", marginVertical: 8 },
  label: { color: "#9fe6ff", fontSize: 13, fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: "rgba(0,229,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.35)",
    borderRadius: 10,
    color: "#eaffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  pay: {
    backgroundColor: "#00e5ff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
  },
  payTxt: { color: "#00141a", fontWeight: "900", fontSize: 16 },
  shipBox: {
    backgroundColor: "rgba(159,230,255,0.06)",
    borderWidth: 1, borderColor: "rgba(159,230,255,0.35)",
    borderRadius: 12, padding: 12, marginBottom: 16
  },
  shipTitle: { color: "#9fe6ff", fontWeight: "800", marginBottom: 6 },
  shipLine: { color: "#eaffff" },
});
