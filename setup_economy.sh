#!/usr/bin/env bash
set -euo pipefail

mkdir -p app/lib app/context app/constants app/assets/shop "app/(tabs)"

cat > app/lib/wallet.ts <<'TS'
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_COINS = "nova.wallet.coins.v1";
const KEY_OWNED = "nova.wallet.owned.v1";
const KEY_EQUIPPED = "nova.wallet.equipped.v1";

export type Equipped = { theme?: string; cursor?: string; avatar?: string };

export async function getCoins(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY_COINS);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export async function setCoins(n: number) {
  await AsyncStorage.setItem(KEY_COINS, String(Math.max(0, Math.floor(n))));
}

export async function addCoins(delta: number) {
  const cur = await getCoins();
  await setCoins(cur + delta);
}

export async function getOwned(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(KEY_OWNED);
  if (!raw) return new Set();
  try { return new Set<string>(JSON.parse(raw) as string[]); } catch { return new Set(); }
}

export async function setOwned(ids: Set<string>) {
  await AsyncStorage.setItem(KEY_OWNED, JSON.stringify(Array.from(ids)));
}

export async function own(id: string) {
  const s = await getOwned();
  s.add(id);
  await setOwned(s);
}

export async function isOwned(id: string): Promise<boolean> {
  const s = await getOwned();
  return s.has(id);
}

export async function getEquipped(): Promise<Equipped> {
  const raw = await AsyncStorage.getItem(KEY_EQUIPPED);
  if (!raw) return {};
  try { return JSON.parse(raw) as Equipped; } catch { return {}; }
}

export async function setEquipped(next: Equipped) {
  await AsyncStorage.setItem(KEY_EQUIPPED, JSON.stringify(next));
}
TS

cat > app/context/WalletContext.tsx <<'TSX'
import React, { createContext, useContext, useEffect, useState } from "react";
import { addCoins, getCoins, getEquipped, getOwned, isOwned, own, setCoins, setEquipped } from "../lib/wallet";

type Ctx = {
  coins: number;
  refresh: () => Promise<void>;
  grant: (n: number) => Promise<void>;
  spend: (n: number) => Promise<boolean>;
  owned: Set<string>;
  purchase: (id: string, price: number) => Promise<boolean>;
  checkOwned: (id: string) => Promise<boolean>;
  equipped: { theme?: string; cursor?: string; avatar?: string };
  equip: (slot: "theme" | "cursor" | "avatar", id: string) => Promise<void>;
};

const WalletContext = createContext<Ctx | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoinsState] = useState(0);
  const [owned, setOwnedState] = useState<Set<string>>(new Set());
  const [equipped, setEquippedState] = useState<{ theme?: string; cursor?: string; avatar?: string }>({});

  const refresh = async () => {
    setCoinsState(await getCoins());
    setOwnedState(await getOwned());
    setEquippedState(await getEquipped());
  };

  useEffect(() => { refresh(); }, []);

  const grant = async (n: number) => { await addCoins(n); await refresh(); };
  const spend = async (n: number) => {
    const cur = await getCoins();
    if (cur < n) return false;
    await setCoins(cur - n);
    await refresh();
    return true;
  };

  const purchase = async (id: string, price: number) => {
    if (await isOwned(id)) return true;
    const ok = await spend(price);
    if (!ok) return false;
    await own(id);
    await refresh();
    return true;
  };

  const checkOwned = (id: string) => isOwned(id);

  const equip = async (slot: "theme" | "cursor" | "avatar", id: string) => {
    const cur = await getEquipped();
    const next = { ...cur, [slot]: id };
    await setEquipped(next);
    await refresh();
  };

  return (
    <WalletContext.Provider value={{ coins, refresh, grant, spend, owned, purchase, checkOwned, equipped, equip }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
TSX

cat > app/constants/shop.ts <<'TS'
export type ItemType = "physical" | "digital";
export type Slot = "theme" | "cursor" | "avatar" | "none";
export type ShopItem = {
  id: string;
  title: string;
  type: ItemType;
  slot: Slot;
  price: number;
  image: any;
  externalUrl?: string;
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: "theme_starfield", title: "Neon Starfield Theme", type: "digital", slot: "theme", price: 500, image: require("../assets/shop/star_theme.png") },
  { id: "theme_glitter", title: "Glitter Theme", type: "digital", slot: "theme", price: 500, image: require("../assets/shop/glitter_theme.png") },
  { id: "cursor_cyan_glow", title: "Cyan Glow Cursor", type: "digital", slot: "cursor", price: 300, image: require("../assets/shop/cursor_glow.png") },
  { id: "cursor_star_trail", title: "Star Trail Cursor", type: "digital", slot: "cursor", price: 300, image: require("../assets/shop/cursor_star.png") },
  { id: "avatar_nova", title: "Avatar: Nova", type: "digital", slot: "avatar", price: 400, image: require("../assets/shop/avatar_nova.png") },
  { id: "bundle_neon_plus", title: "Neon Theme Bundle", type: "digital", slot: "none", price: 900, image: require("../assets/shop/bundle_neon.png") },
  { id: "plush_nova_bunny", title: "Nova Bunny Plush", type: "physical", slot: "none", price: 5000, image: require("../assets/shop/nova_bunny_front.png"), externalUrl: "https://buymeacoffee.com/sventography" },
  { id: "plush_nova_pajama", title: "Pajama Plush", type: "physical", slot: "none", price: 5600, image: require("../assets/shop/nova_pajamas.png"), externalUrl: "https://buymeacoffee.com/sventography" },
  { id: "coins_1000", title: "1,000 Coins Pack", type: "digital", slot: "none", price: 0, image: require("../assets/shop/coins_1000.png") },
  { id: "coins_5000", title: "5,000 Coins Pack", type: "digital", slot: "none", price: 0, image: require("../assets/shop/coins_5000.png") }
];
TS

cat > "app/(tabs)/shop.tsx" <<'TSX'
import React from "react";
import { View, Text, Image, FlatList, Pressable, Alert, Linking } from "react-native";
import { SHOP_ITEMS } from "../../constants/shop";
import { useWallet } from "../../context/WalletContext";

function formatCoins(n: number) {
  return `${n} coins`;
}

export default function ShopTab() {
  const { coins, purchase, owned, equip, equipped, grant } = useWallet();

  const onBuy = async (id: string, title: string, price: number, externalUrl?: string) => {
    if (id.startsWith("coins_")) {
      if (id === "coins_1000") await grant(1000);
      if (id === "coins_5000") await grant(5000);
      Alert.alert("Coins added", "Your balance has been updated.");
      return;
    }
    const ok = await purchase(id, price);
    if (!ok) {
      Alert.alert("Not enough coins", "Earn coins via Achievements or buy a coin pack.");
      return;
    }
    if (externalUrl) {
      Alert.alert("Redeem physical item", "Opening checkout link to complete shipping.", [
        { text: "Cancel", style: "cancel" },
        { text: "Open Link", onPress: () => Linking.openURL(externalUrl) }
      ]);
    } else {
      Alert.alert("Purchased", `${title} unlocked.`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#090c10", padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={{ color: "#eaf6ff", fontSize: 22, fontWeight: "800" }}>Shop</Text>
        <Text style={{ color: "#00e5ff", fontSize: 16, fontWeight: "800" }}>{formatCoins(coins)}</Text>
      </View>
      <FlatList
        data={SHOP_ITEMS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item }) => {
          const isOwned = owned.has(item.id) || item.id.startsWith("coins_");
          const isEquippable = item.slot === "theme" || item.slot === "cursor" || item.slot === "avatar";
          const equippedHere =
            (item.slot === "theme" && equipped.theme === item.id) ||
            (item.slot === "cursor" && equipped.cursor === item.id) ||
            (item.slot === "avatar" && equipped.avatar === item.id);

          return (
            <View
              style={{
                backgroundColor: "#0b0f12",
                borderColor: "#00e5ff",
                borderWidth: 1,
                borderRadius: 12,
                flex: 1,
                marginBottom: 12,
                alignItems: "center",
                padding: 12
              }}
            >
              <Image source={item.image} style={{ width: 100, height: 100, resizeMode: "contain" }} />
              <Text style={{ color: "#eaf6ff", fontSize: 14, fontWeight: "800", marginTop: 8, textAlign: "center" }}>
                {item.title}
              </Text>
              <Text style={{ color: "#99e8ff", fontSize: 12, marginBottom: 8 }}>
                {item.id.startsWith("coins_") ? "Coins Pack" : item.type === "physical" ? "Physical" : "Digital"}
              </Text>

              {!isOwned ? (
                <Pressable
                  onPress={() => onBuy(item.id, item.title, item.price, item.externalUrl)}
                  style={{ backgroundColor: "#0b0f12", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}
                >
                  <Text style={{ color: "#00e5ff", fontWeight: "800" }}>
                    {item.id.startsWith("coins_") ? "Get Coins" : `${item.price} coins`}
                  </Text>
                </Pressable>
              ) : isEquippable ? (
                equippedHere ? (
                  <Text style={{ color: "#79dfff", fontWeight: "800" }}>Equipped</Text>
                ) : (
                  <Pressable
                    onPress={() => equip(item.slot as any, item.id)}
                    style={{ backgroundColor: "#0b0f12", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}
                  >
                    <Text style={{ color: "#00e5ff", fontWeight: "800" }}>Equip</Text>
                  </Pressable>
                )
              ) : (
                <Text style={{ color: "#79dfff", fontWeight: "800" }}>Owned</Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
TSX

cat > "app/(tabs)/achievements.tsx" <<'TSX'
import React, { useState } from "react";
import { View, Text, Pressable, FlatList, Alert } from "react-native";
import { useWallet } from "../../context/WalletContext";

type Ach = { id: string; title: string; desc: string; reward: number; claimed?: boolean };

const BASE: Ach[] = [
  { id: "ach_first_card", title: "First Save", desc: "Add your first flashcard to Collection", reward: 100 },
  { id: "ach_10_cards", title: "Collector", desc: "Save 10 flashcards", reward: 300 },
  { id: "ach_quiz_play", title: "Quiz Starter", desc: "Complete a quiz", reward: 200 },
  { id: "ach_streak_3", title: "3-Day Streak", desc: "Open the app 3 days in a row", reward: 400 }
];

export default function AchievementsTab() {
  const { grant } = useWallet();
  const [items, setItems] = useState<Ach[]>(BASE);

  const claim = async (id: string) => {
    setItems(prev => prev.map(a => a.id === id ? { ...a, claimed: true } : a));
    const found = items.find(a => a.id === id);
    if (found && !found.claimed) {
      await grant(found.reward);
      Alert.alert("Coins earned", `+${found.reward} coins`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#090c10", padding: 16 }}>
      <Text style={{ color: "#eaf6ff", fontSize: 22, fontWeight: "800", marginBottom: 10 }}>Achievements</Text>
      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: "#0b0f12", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <Text style={{ color: "#eaf6ff", fontSize: 16, fontWeight: "800" }}>{item.title}</Text>
            <Text style={{ color: "#99e8ff", marginBottom: 8 }}>{item.desc}</Text>
            {item.claimed ? (
              <Text style={{ color: "#79dfff", fontWeight: "800" }}>Claimed</Text>
            ) : (
              <Pressable onPress={() => claim(item.id)} style={{ alignSelf: "flex-start", backgroundColor: "#0b0f12", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
                <Text style={{ color: "#00e5ff", fontWeight: "800" }}>Claim +coins</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </View>
  );
}
TSX

cat > "app/(tabs)/account.tsx" <<'TSX'
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useWallet } from "../../context/WalletContext";

export default function AccountTab() {
  const { coins, owned, equipped, equip } = useWallet();

  const ownedThemes = Array.from(owned).filter(id => id.startsWith("theme_"));
  const ownedCursors = Array.from(owned).filter(id => id.startsWith("cursor_"));
  const ownedAvatars = Array.from(owned).filter(id => id.startsWith("avatar_"));

  const Pill = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <Pressable onPress={onPress} style={{ paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: active ? "#00e5ff" : "#13404a", borderRadius: 10, marginRight: 8, backgroundColor: "#0b0f12" }}>
      <Text style={{ color: active ? "#00e5ff" : "#7bbfd3", fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex:1, backgroundColor:"#090c10", padding:20 }}>
      <Text style={{ color:"#eaf6ff", fontSize:22, fontWeight:"800" }}>Account</Text>
      <Text style={{ color:"#00e5ff", marginTop:6, marginBottom:14, fontWeight:"800" }}>{coins} coins</Text>

      <Text style={{ color:"#eaf6ff", fontSize:16, fontWeight:"800", marginBottom:6 }}>Theme</Text>
      <View style={{ flexDirection: "row", marginBottom: 12, flexWrap: "wrap" }}>
        {ownedThemes.length === 0 ? <Text style={{ color:"#7bbfd3" }}>Buy a theme in the shop.</Text> :
          ownedThemes.map(id => <Pill key={id} label={id.replace("theme_", "").replace("_"," ")} active={equipped.theme === id} onPress={() => equip("theme", id)} />)}
      </View>

      <Text style={{ color:"#eaf6ff", fontSize:16, fontWeight:"800", marginBottom:6 }}>Cursor</Text>
      <View style={{ flexDirection: "row", marginBottom: 12, flexWrap: "wrap" }}>
        {ownedCursors.length === 0 ? <Text style={{ color:"#7bbfd3" }}>Buy a cursor in the shop.</Text> :
          ownedCursors.map(id => <Pill key={id} label={id.replace("cursor_", "").replace("_"," ")} active={equipped.cursor === id} onPress={() => equip("cursor", id)} />)}
      </View>

      <Text style={{ color:"#eaf6ff", fontSize:16, fontWeight:"800", marginBottom:6 }}>Avatar</Text>
      <View style={{ flexDirection: "row", marginBottom: 12, flexWrap: "wrap" }}>
        {ownedAvatars.length === 0 ? <Text style={{ color:"#7bbfd3" }}>Buy an avatar in the shop.</Text> :
          ownedAvatars.map(id => <Pill key={id} label={id.replace("avatar_", "").replace("_"," ")} active={equipped.avatar === id} onPress={() => equip("avatar", id)} />)}
      </View>
    </View>
  );
}
TSX

if [ -f app/_layout.tsx ]; then
  cat > app/_layout.tsx <<'TSX'
import React from "react";
import { Stack } from "expo-router";
import { CollectionProvider } from "./context/CollectionContext";
import { WalletProvider } from "./context/WalletContext";

export default function RootLayout() {
  return (
    <WalletProvider>
      <CollectionProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </CollectionProvider>
    </WalletProvider>
  );
}
TSX
fi

cat > "app/(tabs)/_layout.tsx" <<'TSX'
import React from "react";
import { Text, ScrollView, Pressable, View } from "react-native";
import { Tabs } from "expo-router";

function ScrollableTabBar({ state, descriptors, navigation }) {
  return (
    <View style={{ backgroundColor: "#0b0f12", borderTopColor: "#00e5ff", borderTopWidth: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, height: 62, alignItems: "center", gap: 8 }}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });
          return (
            <Pressable key={route.key} accessibilityRole="button" accessibilityState={isFocused ? { selected: true } : {}} onPress={onPress} onLongPress={onLongPress} style={{ height: 40, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: isFocused ? "#00e5ff" : "#13404a", backgroundColor: "#0b0f12", flexDirection: "row", alignItems: "center", gap: 6 }}>
              {typeof options.tabBarIcon === "function" ? options.tabBarIcon({ color: isFocused ? "#00e5ff" : "#7bbfd3", size: 18, focused: isFocused }) : null}
              <Text style={{ color: isFocused ? "#00e5ff" : "#7bbfd3", fontSize: 13, fontWeight: "700" }}>{String(label)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }} tabBar={(p) => <ScrollableTabBar {...p} />}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🏠</Text> }} />
      <Tabs.Screen name="ask" options={{ title: "Ask", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>💬</Text> }} />
      <Tabs.Screen name="flashcards" options={{ title: "Cards", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🧠</Text> }} />
      <Tabs.Screen name="quiz" options={{ title: "Quiz", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>📝</Text> }} />
      <Tabs.Screen name="history" options={{ title: "History", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🕒</Text> }} />
      <Tabs.Screen name="collection" options={{ title: "Collection", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🔖</Text> }} />
      <Tabs.Screen name="shop" options={{ title: "Shop", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🛒</Text> }} />
      <Tabs.Screen name="achievements" options={{ title: "Achievements", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🏆</Text> }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>👤</Text> }} />
      <Tabs.Screen name="flashcards/[slug]" options={{ href: null }} />
      <Tabs.Screen name="custom-card/new" options={{ href: null }} />
    </Tabs>
  );
}
TSX

echo "done"
