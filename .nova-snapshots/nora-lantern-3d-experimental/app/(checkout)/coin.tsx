// app/(checkout)/coin.tsx
import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { catalog } from "../_lib/catalog";
import { getSizesFor } from "../constants/sizes";
import { safeAppendPurchase } from "../utils/appendPurchase";
import { sendOrderEmail } from "../utils/sendOrderEmail";
import NeonSuccessModal from "../components/NeonSuccessModal";

const ORDERS_KEY = "@nova/orders";

type Order = {
  id: string;
  sku: string;
  title: string;
  status: "paid" | "fulfilled" | "shipped";
  createdAt: number;
  size?: string | null;
  shipping?: {
    fullName: string;
    email: string;
    addr1: string;
    addr2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
};

export default function CoinCheckout() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    sku?: string;
    title?: string;
    size?: string;
    priceCoins?: string;
  }>();

  const sku = (params.sku || params.id || "").toString();
  const item = useMemo(() => catalog.find((c) => c.id === sku), [sku]);

  const initialSize =
    (params.size || "").toString() ||
    (item
      ? (getSizesFor(
          item.stripeProductId || item.productId || item.id
        )[0] || "")
      : "");

  const priceCoins = Number(
    (params.priceCoins || "").toString() || 0
  );

  const [size, setSize] = useState<string>(initialSize);
  const [placing, setPlacing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // shipping form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("US");

  // -------- BACK HANDLER --------
  function handleBack() {
    // Always go back to the Shop tab from coin checkout
    try {
      router.replace("/(tabs)/shop");
    } catch {
      // Fallback, just in case
      try {
        router.back();
      } catch {
        // swallow
      }
    }
  }

  // -------- PLACE ORDER --------
  async function handlePlaceOrder() {
    if (!sku || !item) return;

    // basic validation just so the form isn’t empty
    if (
      !fullName.trim() ||
      !email.trim() ||
      !addr1.trim() ||
      !city.trim() ||
      !stateRegion.trim() ||
      !postal.trim()
    ) {
      Alert.alert(
        "Missing info",
        "Please fill in your name, email, address, city, state, and ZIP."
      );
      return;
    }

    setPlacing(true);
    try {
      // mark purchase (so it shows in Purchases tab)
      await safeAppendPurchase(sku);

      // store an order locally
      const raw = (await AsyncStorage.getItem(ORDERS_KEY)) || "[]";
      let list: Order[] = [];
      try {
        list = JSON.parse(raw) as Order[];
      } catch {
        list = [];
      }

      const order: Order = {
        id: `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        sku,
        title: item.title,
        status: "paid",
        createdAt: Date.now(),
        size: size || null,
        shipping: {
          fullName: fullName.trim(),
          email: email.trim(),
          addr1: addr1.trim(),
          addr2: addr2.trim(),
          city: city.trim(),
          state: stateRegion.trim(),
          zip: postal.trim(),
          country: country.trim() || "US",
        },
      };

      const next = [order, ...list];
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(next));

      // best-effort email to your backend (safe to fail)
      try {
        await sendOrderEmail({
          itemId: sku,
          title: item.title,
          price: priceCoins || 0,
          email: email.trim(),
          fullName: fullName.trim(),
          addr1: addr1.trim(),
          addr2: addr2.trim(),
          city: city.trim(),
          state: stateRegion.trim(),
          zip: postal.trim(),
          country: country.trim() || "US",
        } as any);
      } catch (e) {
        console.log("sendOrderEmail failed (non-fatal):", e);
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        try {
          router.replace("/(tabs)/shop");
        } catch {
          router.back();
        }
      }, 1500);
    } catch (e) {
      console.error("[coin checkout] place order failed", e);
      Alert.alert(
        "Error",
        "Something went wrong placing your order. Please try again."
      );
    } finally {
      setPlacing(false);
    }
  }

  if (!item) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "black",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "white" }}>Item not found.</Text>
      </SafeAreaView>
    );
  }

  const sizeOptions = getSizesFor(
    item.stripeProductId || item.productId || item.id
  );

  const fieldStyle = {
    borderWidth: 1,
    borderColor: "rgba(75,85,99,1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "white",
    marginBottom: 10,
  } as const;

  const labelStyle = {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 4,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* HEADER ROW WITH TITLE + BACK */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 22,
              fontWeight: "800",
            }}
          >
            Checkout (Coins)
          </Text>

          <Pressable
            onPress={handleBack}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#6b7280",
              backgroundColor: "rgba(31,41,55,0.9)",
            }}
          >
            <Text
              style={{
                color: "#e5e7eb",
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              ‹ Back
            </Text>
          </Pressable>
        </View>

        <Text style={{ color: "#9ca3af", marginBottom: 16 }}>
          {item.title}
        </Text>

        {sizeOptions.length > 0 ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={labelStyle}>Select size</Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {sizeOptions.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSize(s)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor:
                      s === size
                        ? "#00E5FF"
                        : "rgba(255,255,255,0.15)",
                    backgroundColor:
                      s === size
                        ? "rgba(0,229,255,0.12)"
                        : "transparent",
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "700",
                    }}
                  >
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* SHIPPING DETAILS */}
        <Text
          style={{
            color: "white",
            fontWeight: "700",
            marginBottom: 8,
            marginTop: 8,
          }}
        >
          Shipping details
        </Text>

        <View style={{ marginBottom: 4 }}>
          <Text style={labelStyle}>Full name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            style={fieldStyle}
            placeholder="Full name"
            placeholderTextColor="#6b7280"
          />
        </View>

        <View style={{ marginBottom: 4 }}>
          <Text style={labelStyle}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={fieldStyle}
            placeholder="you@example.com"
            placeholderTextColor="#6b7280"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={{ marginBottom: 4 }}>
          <Text style={labelStyle}>Address line 1</Text>
          <TextInput
            value={addr1}
            onChangeText={setAddr1}
            style={fieldStyle}
            placeholder="Street address"
            placeholderTextColor="#6b7280"
          />
        </View>

        <View style={{ marginBottom: 4 }}>
          <Text style={labelStyle}>Address line 2 (optional)</Text>
          <TextInput
            value={addr2}
            onChangeText={setAddr2}
            style={fieldStyle}
            placeholder="Apartment, suite, etc."
            placeholderTextColor="#6b7280"
          />
        </View>

        <View style={{ marginBottom: 4 }}>
          <Text style={labelStyle}>City</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            style={fieldStyle}
            placeholder="City"
            placeholderTextColor="#6b7280"
          />
        </View>

        <View style={{ marginBottom: 4 }}>
          <Text style={labelStyle}>State/Region</Text>
          <TextInput
            value={stateRegion}
            onChangeText={setStateRegion}
            style={fieldStyle}
            placeholder="State or region"
            placeholderTextColor="#6b7280"
          />
        </View>

        <View style={{ marginBottom: 4 }}>
          <Text style={labelStyle}>Postal/ZIP</Text>
          <TextInput
            value={postal}
            onChangeText={setPostal}
            style={fieldStyle}
            placeholder="ZIP code"
            placeholderTextColor="#6b7280"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Country</Text>
          <TextInput
            value={country}
            onChangeText={setCountry}
            style={fieldStyle}
            placeholder="Country"
            placeholderTextColor="#6b7280"
          />
        </View>

        {/* PLACE ORDER */}
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
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: "#E6FEFF",
              fontWeight: "800",
            }}
          >
            {placing ? "Placing…" : "Place Order"}
          </Text>
        </Pressable>
      </ScrollView>

      <NeonSuccessModal
        visible={showSuccess}
        message="Order placed successfully!"
      />
    </SafeAreaView>
  );
}
