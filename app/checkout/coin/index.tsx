// app/checkout/coin/index.tsx
import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeAppendPurchase } from "../../utils/appendPurchase";
import NeonSuccessModal from "../../components/NeonSuccessModal";
import { catalog, type Category } from "../../_lib/catalog";
import { getSizesFor } from "../../constants/sizes";
import { sendOrderEmail } from "../../utils/sendOrderEmail";

const ORDERS_KEY = "@nova/orders";
const REQUIRES_SHIPPING = new Set<Category>(["plushies", "clothing", "tangibles"]);

type Order = {
  id: string;
  sku: string;
  title: string;
  status: "paid" | "fulfilled" | "shipped";
  createdAt: number;
  size?: string | null;
  // shipping (optional for digital)
  name?: string;
  email?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export default function CoinCheckout() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    sku?: string;
    title?: string;
    size?: string;
    priceCoins?: string;
    category?: string;
  }>();

  const sku = (params.sku || params.id || "").toString();
  const item = useMemo(() => catalog.find((c) => c.id === sku), [sku]);

  const requiresShipping = !!(item && REQUIRES_SHIPPING.has(item.category));
  const initialSize =
    (params.size || "").toString() ||
    (item ? (getSizesFor(item.stripeProductId || item.productId || item.id)[0] || "") : "");

  const [size, setSize] = useState<string>(initialSize);
  const [placing, setPlacing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // shipping form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("US");

  function validate(): string | null {
    if (!item) return "Item not found.";
    if (requiresShipping) {
      if (!name.trim()) return "Please enter your full name.";
      if (!email.trim()) return "Please enter your email.";
      if (!address1.trim()) return "Please enter your address.";
      if (!city.trim()) return "Please enter your city.";
      if (!state.trim()) return "Please enter your state/region.";
      if (!postalCode.trim()) return "Please enter your postal/ZIP code.";
      if (!country.trim()) return "Please enter your country.";
    }
    return null;
  }

  async function handlePlaceOrder() {
    setErr(null);
    const v = validate();
    if (v) { setErr(v); return; }
    if (!sku || !item) { setErr("Item not found."); return; }

    setPlacing(true);
    try {
      // 1) record purchase
      await safeAppendPurchase(sku);

      // 2) build + persist order (local)
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
        ...(requiresShipping
          ? { name, email, address1, address2, city, state, postalCode, country }
          : {}),
      };

      const next = [order, ...list];
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(next));

      // 3) send emails (user confirmation + admin notification), best-effort
      try {
        await sendOrderEmail({
          ...order,
          category: item.category,
          coinsPrice: item.priceCoins ?? 0,
        });
      } catch (e) {
        console.warn("[email] failed to send order email (continuing):", e);
      }

      // 4) neon success modal ➜ back to Shop
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        try { router.replace("/(tabs)/shop"); } catch { router.back(); }
      }, 1200);
    } catch (e) {
      console.error("[coin checkout] place order failed", e);
      setErr("Failed to place order. Please try again.");
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={{ color: "white", fontSize: 22, fontWeight: "800", marginBottom: 8 }}>
            Checkout (Coins)
          </Text>
          <Text style={{ color: "#9ca3af", marginBottom: 16 }}>
            {item.title} ({sku})
          </Text>

          {sizeOptions.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: "#9ca3af", marginBottom: 8 }}>Select size</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
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

          {requiresShipping ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: "#9ca3af", marginBottom: 8 }}>Shipping details</Text>
              {[
                { label: "Full name", value: name, onChange: setName, key: "name", autoCapitalize: "words" as const },
                { label: "Email", value: email, onChange: setEmail, key: "email", keyboardType: "email-address" as const, autoCapitalize: "none" as const },
                { label: "Address line 1", value: address1, onChange: setAddress1, key: "address1" },
                { label: "Address line 2 (optional)", value: address2, onChange: setAddress2, key: "address2" },
                { label: "City", value: city, onChange: setCity, key: "city" },
                { label: "State/Region", value: state, onChange: setState, key: "state" },
                { label: "Postal/ZIP", value: postalCode, onChange: setPostalCode, key: "postal", keyboardType: "numbers-and-punctuation" as const },
                { label: "Country", value: country, onChange: setCountry, key: "country", autoCapitalize: "characters" as const },
              ].map((f) => (
                <View key={f.key} style={{ marginBottom: 10 }}>
                  <Text style={{ color: "#9ca3af", marginBottom: 6 }}>{f.label}</Text>
                  <TextInput
                    value={f.value}
                    onChangeText={f.onChange}
                    autoCapitalize={f.autoCapitalize ?? "words"}
                    keyboardType={f.keyboardType ?? "default"}
                    placeholderTextColor="#6b7280"
                    style={{
                      color: "white",
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.15)",
                      backgroundColor: "rgba(255,255,255,0.05)",
                    }}
                  />
                </View>
              ))}
            </View>
          ) : null}

          {err ? <Text style={{ color: "#fb7185", marginBottom: 10 }}>{err}</Text> : null}

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
      </KeyboardAvoidingView>

      <NeonSuccessModal visible={showSuccess} message="Order placed successfully!" />
    </SafeAreaView>
  );
}
