// app/checkout/coin.tsx
import React, { useMemo, useState } from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCoins } from "../context/CoinsContext";
import { placeCoinOrder } from "../utils/orders";
import { appendPurchase } from "../storage/purchases";

export default function CheckoutCoins() {
  const { itemId = "", title = "Item", cost = "0" } =
    useLocalSearchParams<{ itemId?: string; title?: string; cost?: string }>();
  const router = useRouter();
  const { coins, spendCoins } = useCoins();

  const price = useMemo(() => Math.max(0, parseInt(String(cost), 10) || 0), [cost]);
  const numericCoins = Number.isFinite(coins) ? coins : 0;
  const canAfford = numericCoins >= price;

  const [busy, setBusy] = useState(false);

  // Controlled fields
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");

  const validate = () => {
    if (!email.trim()) return "Email is required.";
    if (!fullName.trim()) return "Full Name is required.";
    if (!addr1.trim()) return "Address line 1 is required.";
    if (!city.trim()) return "City is required.";
    if (!stateVal.trim()) return "State is required.";
    if (!zip.trim()) return "ZIP is required.";
    return null;
  };

  const navigateToPurchases = () => router.replace("/purchases");

  const handlePlaceOrder = async () => {
    if (busy) return;

    const err = validate();
    if (err) {
      Alert.alert("Missing info", err);
      return;
    }
    if (!canAfford) {
      Alert.alert("Not enough coins", "Your balance isn't sufficient for this purchase.");
      return;
    }

    setBusy(true);
    try {
      // 1) Deduct coins atomically (prevents race conditions)
      const ok = spendCoins(price);
      if (!ok) {
        Alert.alert("Not enough coins", "Your balance isn't sufficient for this purchase.");
        return;
      }

      // 2) Call backend to email you + create server order record
      const resp = await placeCoinOrder({
        itemId,
        title,
        price,
        email,
        fullName,
        phone,
        addr1,
        addr2,
        city,
        state: stateVal,
        zip,
      });

      // 3) Log locally so Purchases screen shows it instantly
      await appendPurchase({
        id: `coins_${Date.now()}`,
        createdAt: Date.now(),
        source: "coins",
        itemId,
        title,
        amount: price,
        meta: {
          email,
          fullName,
          phone,
          addr1,
          addr2,
          city,
          state: stateVal,
          zip,
          serverOrderId: resp.orderId,
        },
      });

      const done = () => navigateToPurchases();

      if (Platform.OS === "ios" || Platform.OS === "android") {
        Alert.alert(
          resp.ok ? "Purchase complete" : "Purchase recorded",
          resp.ok
            ? `${title} purchased with coins! A confirmation email has been sent to the store owner.`
            : `${title} purchased with coins! (Email failed: ${resp.message ?? "unknown"})`,
          [{ text: "OK", onPress: done }]
        );
      } else {
        done();
      }
    } catch (e) {
      console.error("[coin checkout] place order failed", e);
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const Field = ({
    label,
    value,
    onChangeText,
    required,
    keyboardType,
    autoCapitalize,
  }: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    required?: boolean;
    keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
  }) => (
    <View style={{ gap: 6 }}>
      <Text style={{ color: "#cbd5e1" }}>
        {label}
        {required ? " *" : ""}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#6b7280"
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "none"}
        autoCorrect={false}
        style={{
          backgroundColor: "#0f172a",
          color: "white",
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "rgba(0,229,255,0.35)",
        }}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>Checkout (Coins)</Text>
        <Text style={{ color: "#80dfff", textDecorationLine: "underline" }}>{title}</Text>
        <Text style={{ color: "white" }}>Cost: {price.toLocaleString()} coins</Text>
        <Text style={{ color: "white" }}>Balance: {numericCoins.toLocaleString()} coins</Text>

        <Field
          label="Email"
          required
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field label="Full Name" required value={fullName} onChangeText={setFullName} autoCapitalize="words" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Address line 1" required value={addr1} onChangeText={setAddr1} />
        <Field label="Address line 2" value={addr2} onChangeText={setAddr2} />
        <Field label="City" required value={city} onChangeText={setCity} autoCapitalize="words" />
        <Field label="State" required value={stateVal} onChangeText={setStateVal} autoCapitalize="characters" />
        <Field label="ZIP" required value={zip} onChangeText={setZip} keyboardType="number-pad" />

        <Pressable
          onPress={handlePlaceOrder}
          disabled={busy || !canAfford}
          style={({ pressed }) => ({
            marginTop: 8,
            opacity: !canAfford ? 0.6 : pressed ? 0.85 : 1,
            backgroundColor: "#16a34a",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
          })}
        >
          {busy ? (
            <ActivityIndicator />
          ) : (
            <Text style={{ color: "white", fontWeight: "800" }}>
              {canAfford ? "Place Order" : "Not enough coins"}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          disabled={busy}
          style={{
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: "#334155",
          }}
        >
          <Text style={{ color: "white" }}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
