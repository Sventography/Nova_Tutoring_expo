// app/(checkout)/coin.tsx
import React, { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, View, Text, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NeonSuccessModal from "../components/NeonSuccessModal";
import { catalog } from "../_lib/catalog";
import { getSizesFor } from "../constants/sizes";

const ORDERS_KEY = "@nova/orders";

type Order = {
  id: string;
  sku: string;
  title: string;
  status: "paid" | "fulfilled" | "shipped";
  createdAt: number;
  size?: string | null;
};

export default function CoinCheckout() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; sku?: string; title?: string; size?: string }>();

  const sku = (params.sku || params.id || "").toString();
  const item = useMemo(() => catalog.find((c) => c.id === sku), [sku]);

  const initialSize =
    (params.size || "").toString() ||
    (item ? (getSizesFor(item.stripeProductId || item.productId || item.id)[0] || "") : "");

  const [size, setSize] = useState<string>(initialSize);
  const [placing, setPlacing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  async function handlePlaceOrder() {
    if (!sku || !item) return;
    setPlacing(true);
    try {
      // Record order locally (coins were checked before we navigated here)
      const raw = (await AsyncStorage.getItem(ORDERS_KEY)) || "[]";
      let list: Order[] = [];
      try { list = JSON.parse(raw) as Order[]; } catch {}

      const order: Order = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sku,
        title: item.title,
        status: "paid",
        createdAt: Date.now(),
        size: size || null,
      };

      const next = [order, ...list];
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(next));

      // Success UI → back to Shop
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        try { router.replace("/(tabs)/shop"); } catch { router.back(); }
      }, 1500);
    } catch (e) {
      console.error("[coin checkout] place order failed", e);
    } finally {
      setPlacing(false);
    }
  }

  if (!item) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "black", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "white" }}>Item not found.</Text>
      </SafeAreaView>
    );
  }

  const sizeOptions = getSizesFor(item.stripeProductId || item.productId || item.id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "800", marginBottom: 8 }}>
          Checkout (Coins)
        </Text>
        <Text style={{ color: "#9ca3af", marginBottom: 16 }}>{item.title}</Text>

        {sizeOptions.length > 0 ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: "#9ca3af", marginBottom: 8 }}>Select size</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {sizeOptions.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSize(s)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: s === size ? "#00E5FF" : "rgba(255,255,255,0.15)",
                    backgroundColor: s === size ? "rgba(0,229,255,0.12)" : "transparent",
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={handlePlaceOrder}
          disabled={placing}
          style={{
            alignItems: "center",
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#00E5FF",
            backgroundColor: "rgba(0,229,255,0.12)",
            opacity: placing ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#E6FEFF", fontWeight: "800" }}>
            {placing ? "Placing…" : "Place Order"}
          </Text>
        </Pressable>
      </ScrollView>

      <NeonSuccessModal visible={showSuccess} message="Order placed successfully!" />
    </SafeAreaView>
  );
}
