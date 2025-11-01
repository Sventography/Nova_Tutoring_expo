import * as React from "react";
import { View, Text, TextInput, ScrollView, Pressable, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useWallet } from "@/state/wallet";

function getBackend(): string {
  const env = (process?.env?.EXPO_PUBLIC_BACKEND_URL as string) || "";
  if (env) return env.replace(/\/+$/g, "");
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    const isLan = /^\d+\.\d+\.\d+\.\d+$/.test(h) || /^(localhost|127\.0\.0\.1)$/i.test(h);
    const host = isLan ? h : "127.0.0.1";
    return `http://${host}:8788`;
  }
  return "http://127.0.0.1:8788";
}

async function postJSON(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  return { ok: res.ok, json, text };
}

export default function CoinCheckoutScreen() {
  const params = useLocalSearchParams<{
    itemId: string;
    title: string;
    cost: string;
    imageUrl?: string;
    category?: string;
    balance?: string;
    size?: string;
  }>();

  const cost = Math.max(0, Number(params.cost || 0));
  const title = params.title || "Item";
  const itemId = params.itemId || "";
  const selectedSize = (params.size || "").trim();   // <— NEW
  const wallet = useWallet();

  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [addr1, setAddr1] = React.useState("");
  const [addr2, setAddr2] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [zip, setZip] = React.useState("");
  const [country, setCountry] = React.useState("US");
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit() {
    if (!itemId || !cost) {
      Alert.alert("Missing info", "Invalid item or price.");
      return;
    }
    if (!email || !name || !addr1 || !city || !state || !zip) {
      Alert.alert("Missing fields", "Please fill all required fields.");
      return;
    }
    if (wallet.coins < cost) {
      Alert.alert("Not enough coins", "You need more coins for this item.");
      return;
    }

    setSubmitting(true);
    const BACKEND = getBackend();

    // 1) Start reservation (include size in meta so the server can validate/echo back)
    const start = await postJSON(`${BACKEND}/orders/coin/start`, {
      itemId,
      title,
      priceCoins: cost,
      currentBalance: wallet.coins,
      meta: { size: selectedSize || null },          // <— NEW
    });
    if (!start.ok || !start.json?.ok) {
      setSubmitting(false);
      Alert.alert(
        "Could not start checkout",
        start.json?.error || start.text || "Unknown error"
      );
      return;
    }
    const reservationId = start.json.reservationId as string;

    // Optimistic deduct
    wallet.spendLocal(cost);

    // 2) Confirm with shipping details (+ size persisted)
    const confirm = await postJSON(`${BACKEND}/orders/coin/confirm`, {
      reservationId,
      shipping: {
        email,
        name,
        phone,
        address1: addr1,
        address2: addr2,
        city,
        state,
        zip,
        country,
        size: selectedSize || null,                  // <— NEW
      },
    });

    setSubmitting(false);

    if (!confirm.ok || !confirm.json?.ok) {
      // rollback
      useWallet.getState().addCoins(cost);
      Alert.alert(
        "Purchase failed",
        confirm.json?.error || confirm.text || "Unknown error"
      );
      return;
    }

    // set authoritative balance if returned
    if (typeof confirm.json.balance === "number") {
      wallet.setCoins(confirm.json.balance);
    }

    Alert.alert(
      "Order placed!",
      `${title}${selectedSize ? ` (${selectedSize})` : ""} is on the way.`,
      [{ text: "OK", onPress: () => router.replace("/purchases") }]
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Checkout (Coins)</Text>
      <Text style={{ color: "#89c2d9" }}>
        {title}
        {selectedSize ? ` · ${selectedSize}` : ""}
      </Text>
      <Text style={{ fontSize: 16 }}>
        Cost: {cost.toLocaleString()} coins
      </Text>
      <Text style={{ fontSize: 14, color: "#9aa" }}>
        Balance: {wallet.coins.toLocaleString()} coins
      </Text>

      {selectedSize ? (
        <View style={{ paddingVertical: 6 }}>
          <Text style={{ fontSize: 12, color: "#9aa" }}>Selected size</Text>
          <View
            style={{
              marginTop: 4,
              padding: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#1e293b",
              backgroundColor: "#0f172a",
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>
              {selectedSize}
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={{ marginTop: 12, fontWeight: "600" }}>
        Contact & Shipping
      </Text>

      <TextInput
        placeholder="Email *"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={I}
      />
      <TextInput
        placeholder="Full Name *"
        value={name}
        onChangeText={setName}
        style={I}
      />
      <TextInput
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={I}
      />

      <TextInput
        placeholder="Address line 1 *"
        value={addr1}
        onChangeText={setAddr1}
        style={I}
      />
      <TextInput
        placeholder="Address line 2"
        value={addr2}
        onChangeText={setAddr2}
        style={I}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          placeholder="City *"
          value={city}
          onChangeText={setCity}
          style={[I, { flex: 1 }]}
        />
        <TextInput
          placeholder="State *"
          value={state}
          onChangeText={setState}
          style={[I, { width: 90 }]}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          placeholder="ZIP *"
          value={zip}
          onChangeText={setZip}
          keyboardType="number-pad"
          style={[I, { flex: 1 }]}
        />
        <TextInput
          placeholder="Country"
          value={country}
          onChangeText={setCountry}
          style={[I, { width: 120 }]}
        />
      </View>

      <Pressable
        disabled={submitting}
        onPress={onSubmit}
        style={{
          backgroundColor: submitting ? "#888" : "#22c55e",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>
          {submitting ? "Processing…" : "Place Order"}
        </Text>
      </Pressable>

      <Pressable
        disabled={submitting}
        onPress={() => router.back()}
        style={{
          backgroundColor: "#334155",
          padding: 12,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white" }}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const I = {
  backgroundColor: "#0f172a",
  color: "white",
  borderRadius: 10,
  padding: 12,
  borderWidth: 1,
  borderColor: "#1e293b",
} as const;
