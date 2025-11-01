console.log("SHOP PROBE: app/tabs/shop.tsx");
// app/tabs/shop.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { startCoinCheckout } from "@/utils/coinCheckout";
import { startCashCheckoutForItem } from "@/app/_lib/checkoutHelpers";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Image,
  LayoutAnimation,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";

import { useCoins } from "../context/CoinsContext";          // ✅ unified coins
import { useTheme } from "../context/ThemeContext";

// If these live elsewhere in your repo, adjust paths:
import { CATEGORY_BORDER } from "../constants/catalog";
import { catalog, altImages } from "../constants/shopAssets";
import { InsufficientCoinsModal } from "../components/InsufficientCoinsModal";

import AsyncStorage from "@react-native-async-storage/async-storage";

// -------------------- Config --------------------
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8787";

// -------------------- Types ---------------------
type PurchaseMap = Record<string, true>;

type Order = {
  id: string;
  sku: string;
  title: string;
  status: "paid" | "fulfilled" | "shipped";
  createdAt: number;
};

// -------------------- Local storage (NOT coins) --------------------
// We keep purchases/cursor/orders in storage, but coins come ONLY from CoinsContext.
const PURCHASES_KEY = "@nova/purchases";
const CURSOR_KEY    = "@nova/cursor";
const ORDERS_KEY    = "@nova/orders";

async function loadPurchases(): Promise<PurchaseMap> {
  const v = await AsyncStorage.getItem(PURCHASES_KEY);
  return v ? JSON.parse(v) : {};
}
async function savePurchases(m: PurchaseMap) {
  await AsyncStorage.setItem(PURCHASES_KEY, JSON.stringify(m));
}

async function loadCursor(): Promise<string | null> {
  return (await AsyncStorage.getItem(CURSOR_KEY)) || null;
}
async function saveCursor(key: string) {
  await AsyncStorage.setItem(CURSOR_KEY, key);
}

async function loadOrders(): Promise<Order[]> {
  const raw = (await AsyncStorage.getItem(ORDERS_KEY)) || "[]";
  try {
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}
async function saveOrders(list: Order[]) {
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(list));
}

// -------------------- Checkout helpers --------------------
/** Open Stripe Checkout for a specific SKU via your Node server */
function openCheckoutStart(sku: string) {
  const url = `${BACKEND_URL}/checkout/start?sku=${encodeURIComponent(sku)}`;
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    Linking.openURL(url);
  }
}

// -------------------- UI helpers --------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: "#cfeaf0", fontSize: 16, fontWeight: "800", marginBottom: 10 }}>
        {title}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
        {children}
      </View>
    </View>
  );
}

function Card({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <View
      style={{
        width: "48%",
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: "rgba(255,255,255,0.03)",
      }}
    >
      {children}
    </View>
  );
}

// ======================================================
//                         Shop
// ======================================================
export default function Shop() {
  const { coins, add, spend, set } = useCoins(); // ✅ ONE source of truth for coins
  const { setThemeById } = useTheme();

  const [purchases, setPurchases] = useState<PurchaseMap>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [need, setNeed] = useState<number>(0);
  const [showInsufficient, setShowInsufficient] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Boot: load purchases, cursor, orders (coins come from CoinsContext provider)
  useEffect(() => {
    (async () => {
      const [p, cur, ord] = await Promise.all([loadPurchases(), loadCursor(), loadOrders()]);
      setPurchases(p);
      setCurrentCursor(cur);
      setOrders(ord);
    })();
  }, []);

  // Group items by category (for sections)
  const groups = useMemo(() => {
    const byCat: Record<
      "plushies" | "clothing" | "tangibles" | "cursor" | "theme" | "bundle" | "coin_pack",
      typeof catalog
    > = {
      plushies: [],
      clothing: [],
      tangibles: [],
      cursor: [],
      theme: [],
      bundle: [],
      coin_pack: [],
    };
    for (const it of catalog) byCat[it.category].push(it);
    return byCat;
  }, []);

  // -------------------- Actions --------------------
  async function buyWithCoins(it: any) {
    const price = it.priceCoins ?? 0;
    if (!price) return;

    if (coins < price) {
      setNeed(price - coins);
      setShowInsufficient(true);
      return;
    }

    // deduct via context and mark owned
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await spend(price); // ⬅️ await so UI stays in sync

    const nextPurch = { ...purchases, [it.id]: true } as PurchaseMap;
    setPurchases(nextPurch);
    savePurchases(nextPurch);

    // auto-equip on coin purchase
    if (it.category === "theme" && it.themeId) setThemeById(it.themeId);
    if (it.category === "cursor") equipCursor(it);
  }

  function moneyBuy(it: any) {
    // Open hosted checkout. Success will deep-link back to app (handled globally in _layout.tsx → fulfillPurchase)
    openCheckoutStart(it.id);
  }

  function equipTheme(it: any) {
    if (purchases[it.id] && it.themeId) setThemeById(it.themeId);
  }

  async function equipCursor(it: any) {
    // allow equip if owned
    if (purchases[it.id] || it.category === "cursor") {
      setCurrentCursor(it.id);
      await saveCursor(it.id);
    }
  }

  const renderItem = (it: any, color: string, equipable?: "theme" | "cursor") => {
    const owned = !!purchases[it.id];
    const showAlt = flipped[it.id] && it.altImageKey && altImages[it.altImageKey];
    const src = showAlt ? altImages[it.altImageKey!] : it.image;

    return (
      <Card key={it.id} color={color}>
        {/* Image */}
        {src ? (
          <Pressable
            onPress={() =>
              it.altImageKey && setFlipped((f) => ({ ...f, [it.id]: !f[it.id] }))
            }
            style={{
              width: "100%",
              height: 110,
              borderRadius: 10,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: color,
              marginBottom: 8,
            }}
          >
            <Image source={src} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
          </Pressable>
        ) : null}

        {/* Title */}
        <Text
          style={{ color: "#eaf7fb", fontSize: 14, fontWeight: "700", textAlign: "center" }}
          numberOfLines={2}
        >
          {it.title}
        </Text>

        {/* Description (optional) */}
        {it.desc ? (
          <Text
            style={{
              color: "#b0c9cf",
              fontSize: 12,
              lineHeight: 16,
              textAlign: "center",
              marginTop: 4,
              paddingHorizontal: 8,
            }}
            numberOfLines={3}
          >
            {it.desc}
          </Text>
        ) : null}

        <View style={{ height: 8 }} />

        {/* Buttons */}
        {equipable === "theme" ? (
          owned ? (
            <Pressable
              onPress={() => equipTheme(it)}
              style={({ pressed }) => ({
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#5cfcc8",
                backgroundColor: pressed ? "rgba(92,252,200,0.15)" : "rgba(92,252,200,0.08)",
              })}
            >
              <Text style={{ color: "#5cfcc8", fontWeight: "800" }}>Equip</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: "row", justifyContent: "space-between", columnGap: 8 }}>
              <Pressable
                onPress={() => buyWithCoins(it)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: color,
                }}
              >
                <Text style={{ color: color, fontWeight: "800" }}>
                  {(it.priceCoins ?? 0).toLocaleString()} coins
                </Text>
              </Pressable>
              <Pressable
                onPress={() => moneyBuy(it)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: color,
                }}
              >
                <Text style={{ color: color, fontWeight: "800" }}>
                  ${it.priceUSD?.toFixed(0)}
                </Text>
              </Pressable>
            </View>
          )
        ) : equipable === "cursor" ? (
          owned ? (
            <Pressable
              onPress={() => equipCursor(it)}
              style={({ pressed }) => ({
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#5cfcc8",
                backgroundColor: pressed ? "rgba(92,252,200,0.15)" : "rgba(92,252,200,0.08)",
              })}
            >
              <Text style={{ color: "#5cfcc8", fontWeight: "800" }}>
                {currentCursor === it.id ? "Equipped ✓" : "Equip"}
              </Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: "row", justifyContent: "space-between", columnGap: 8 }}>
              <Pressable
                onPress={() => buyWithCoins(it)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: color,
                }}
              >
                <Text style={{ color: color, fontWeight: "800" }}>
                  {(it.priceCoins ?? 0).toLocaleString()} coins
                </Text>
              </Pressable>
              <Pressable
                onPress={() => moneyBuy(it)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: color,
                }}
              >
                <Text style={{ color: color, fontWeight: "800" }}>
                  ${it.priceUSD?.toFixed(0)}
                </Text>
              </Pressable>
            </View>
          )
        ) : it.category === "coin_pack" ? (
          <Pressable
            onPress={() => openCheckoutStart(it.id)} // treat coin packs as SKUs on server
            style={({ pressed }) => ({
              alignItems: "center",
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: color,
              backgroundColor: pressed ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.08)",
            })}
          >
            <Text style={{ color: color, fontWeight: "800" }}>${it.priceUSD?.toFixed(0)}</Text>
          </Pressable>
        ) : (
          <View style={{ flexDirection: "row", justifyContent: "space-between", columnGap: 8 }}>
            <Pressable
              onPress={() => buyWithCoins(it)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: color,
              }}
            >
              <Text style={{ color: color, fontWeight: "800" }}>
                {(it.priceCoins ?? 0).toLocaleString()} coins
              </Text>
            </Pressable>
            <Pressable
              onPress={() => moneyBuy(it)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: color,
              }}
            >
              <Text style={{ color: color, fontWeight: "800" }}>
                ${it.priceUSD?.toFixed(0)}
              </Text>
            </Pressable>
          </View>
        )}
      </Card>
    );
  };

  return (
    <LinearGradient colors={["#000000", "#001822"]} style={{ flex: 1 , paddingTop: 60 }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#cfeaf0", fontSize: 24, fontWeight: "800" }}>Shop</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#00e5ff",
              backgroundColor: "rgba(0,229,255,0.1)",
            }}
          >
            <Ionicons name="sparkles" size={16} color="#00e5ff" />
            <Text style={{ color: "#cfeaf0", marginLeft: 6, fontWeight: "700" }}>
              {coins.toLocaleString()} coins
            </Text>
          </View>
        </View>

        {/* Sections */}
        <Section title="Plushies">
          {groups.plushies.map((it) => renderItem(it, CATEGORY_BORDER.plushies))}
        </Section>

        <Section title="Clothing">
          {groups.clothing.map((it) => renderItem(it, CATEGORY_BORDER.clothing))}
        </Section>

        <Section title="Tangibles">
          {groups.tangibles.map((it) => renderItem(it, CATEGORY_BORDER.tangibles))}
        </Section>

        <Section title="Cursors">
          {groups.cursor.map((it) => renderItem(it, CATEGORY_BORDER.cursor, "cursor"))}
        </Section>

        <Section title="Themes">
          {groups.theme.map((it) => renderItem(it, CATEGORY_BORDER.theme, "theme"))}
        </Section>

        <Section title="Bundles">
          {groups.bundle.map((it) => renderItem(it, CATEGORY_BORDER.bundle))}
        </Section>

        <Section title="Coin Packs">
          {groups.coin_pack.map((it) => renderItem(it, CATEGORY_BORDER.coin_pack))}
        </Section>

        {/* Orders list */}
        {orders.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: "#cfeaf0", fontSize: 16, fontWeight: "800", marginBottom: 10 }}>
              Orders
            </Text>
            {orders.map((o) => (
              <View
                key={o.id}
                style={{
                  borderWidth: 1,
                  borderColor: "#2a3d45",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                  backgroundColor: "rgba(255,255,255,0.03)",
                }}
              >
                <Text style={{ color: "#eaf7fb", fontWeight: "700" }}>{o.title}</Text>
                <Text style={{ color: "#9fb7bd", fontSize: 12, marginTop: 2 }}>
                  {new Date(o.createdAt).toLocaleString()} · {o.status.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <InsufficientCoinsModal
        visible={showInsufficient}
        needed={need}
        onClose={() => setShowInsufficient(false)}
        onBuyCoins={() => {
          setShowInsufficient(false);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
        }}
      />
    </LinearGradient>
  );
}
