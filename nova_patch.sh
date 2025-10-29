#!/usr/bin/env bash
set -euo pipefail

# Robust writer: write_file "path/with (parens).tsx" <<'END'
write_file() {
  local f="$1"
  shift
  mkdir -p "$(dirname "$f")"
  # shellcheck disable=SC2129
  : > "$f"
  cat > "$f"
  echo "Wrote: $f"
}

# 1) User context
write_file "app/context/UserContext.tsx" <<'TS'
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type UserState = {
  username: string;
  avatarUri: string | null;
  coins: number;
  setUsername: (v: string) => void;
  setAvatarUri: (v: string | null) => void;
  addCoins: (n: number) => void;
  setCoins: (n: number) => void;
  reset: () => void;
};

const Ctx = createContext<UserState | null>(null);
const KEY = "@nova_user_v1";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setUsername(saved.username || "");
          setAvatarUri(saved.avatarUri ?? null);
          setCoins(typeof saved.coins === "number" ? saved.coins : 0);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(KEY, JSON.stringify({ username, avatarUri, coins })).catch(()=>{});
  }, [username, avatarUri, coins]);

  const value = useMemo<UserState>(() => ({
    username,
    avatarUri,
    coins,
    setUsername,
    setAvatarUri,
    addCoins: (n: number) => setCoins(c => Math.max(0, c + n)),
    setCoins,
    reset: () => { setUsername(""); setAvatarUri(null); setCoins(0); }
  }), [username, avatarUri, coins]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUser must be used inside <UserProvider>");
  return v;
}
TS

# 2) Achievements (tiers, colored borders, coin rewards)
write_file "app/context/AchievementsContext.tsx" <<'TS'
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@/context/UserContext";

export type Difficulty = "bronze" | "silver" | "gold" | "diamond";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  coins: number;
  icon?: any;
};

export type Unlocked = { id: string; unlockedAt: number };

type AchState = {
  all: Achievement[];
  unlocked: Record<string, Unlocked>;
  unlockAchievement: (id: string) => boolean;
  isUnlocked: (id: string) => boolean;
  resetAchievements: () => void;
};

const KEY = "@nova_achievements_v1";
const DIFF_COLORS: Record<Difficulty, string> = {
  bronze: "#cd7f32", silver: "#c0c0c0", gold: "#ffd700", diamond: "#7df9ff",
};
export function difficultyColor(d: Difficulty) { return DIFF_COLORS[d]; }

const DEFAULTS: Achievement[] = [
  { id: "first_login",   title: "First Login",     description: "Log in once.",                     difficulty: "bronze",  coins: 15 },
  { id: "set_avatar",    title: "New Look",        description: "Set a custom avatar.",            difficulty: "bronze",  coins: 20 },
  { id: "ask_10",        title: "Curious Mind I",  description: "Ask 10 questions.",               difficulty: "silver",  coins: 40 },
  { id: "ask_50",        title: "Curious Mind II", description: "Ask 50 questions.",               difficulty: "gold",    coins: 100 },
  { id: "ask_100",       title: "Endless Curiosity",description:"Ask 100 questions.",              difficulty: "diamond", coins: 250 },
  { id: "voice_first",   title: "Speak Up",        description: "Use voice once.",                 difficulty: "bronze",  coins: 25 },
  { id: "voice_25",      title: "Talkative",       description: "Use voice 25 times.",             difficulty: "silver",  coins: 75 },
  { id: "teaser_first",  title: "First Tease",     description: "Solve 1 brainteaser.",            difficulty: "bronze",  coins: 20 },
  { id: "teaser_10",     title: "Tease Tamer",     description: "Solve 10 brainteasers.",          difficulty: "silver",  coins: 60 },
  { id: "teaser_25",     title: "Riddle Master",   description: "Solve 25 brainteasers.",          difficulty: "gold",    coins: 120 },
  { id: "first_purchase",title: "First Purchase",  description: "Buy something from the shop.",    difficulty: "silver",  coins: 50 },
  { id: "collector_5",   title: "Collector",       description: "Own 5 shop items.",               difficulty: "gold",    coins: 150 },
  { id: "cards_50",      title: "Study Buddy",     description: "Review 50 flashcards.",           difficulty: "silver",  coins: 60 },
  { id: "cards_200",     title: "Study Machine",   description: "Review 200 flashcards.",          difficulty: "gold",    coins: 160 },
  { id: "cards_500",     title: "Memory Master",   description: "Review 500 flashcards.",          difficulty: "diamond", coins: 350 },
];

const AchCtx = createContext<AchState | null>(null);

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<Record<string, Unlocked>>({});
  const [all] = useState<Achievement[]>(DEFAULTS);
  const { addCoins } = useUser();

  useEffect(() => { (async () => {
    try { const raw = await AsyncStorage.getItem(KEY); if (raw) setUnlocked(JSON.parse(raw)); } catch {}
  })(); }, []);

  useEffect(() => { AsyncStorage.setItem(KEY, JSON.stringify(unlocked)).catch(()=>{}); }, [unlocked]);

  const isUnlocked = (id: string) => !!unlocked[id];

  const unlockAchievement = (id: string) => {
    if (isUnlocked(id)) return false;
    const ach = all.find(a => a.id === id);
    if (!ach) return false;
    setUnlocked(prev => ({ ...prev, [id]: { id, unlockedAt: Date.now() } }));
    addCoins(ach.coins);
    return true;
  };

  const resetAchievements = () => setUnlocked({});

  const value: AchState = useMemo(() => ({
    all, unlocked, unlockAchievement, isUnlocked, resetAchievements
  }), [all, unlocked]);

  return <AchCtx.Provider value={value}>{children}</AchCtx.Provider>;
}

export function useAchievements() {
  const v = useContext(AchCtx);
  if (!v) throw new Error("useAchievements must be used inside <AchievementsProvider>");
  return v;
}
TS

# 3) Achievements hook
write_file "app/context/achievements-bridge.ts" <<'TS'
import { useAchievements } from "@/context/AchievementsContext";
import { useCallback } from "react";

export function useAchieve() {
  const { unlockAchievement, isUnlocked } = useAchievements();
  return {
    unlock: useCallback((id: string) => unlockAchievement(id), [unlockAchievement]),
    isUnlocked,
  };
}
TS

# 4) Header: UserBadge (Guest pill opens profile), CoinPill (also opens)
write_file "app/components/UserBadge.tsx" <<'TS'
import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@/context/UserContext";

export default function UserBadge() {
  const { username, avatarUri } = useUser();
  const router = useRouter();
  const source = avatarUri ? { uri: avatarUri } : require("@/assets/shop/nova_bunny_front.png");
  const displayName = username || "Guest";
  const goProfile = () => router.push("/(tabs)/account?focus=profile");

  return (
    <TouchableOpacity onPress={goProfile} accessibilityRole="button">
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "rgba(0, 229, 255, 0.10)",
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 999, borderWidth: 1, borderColor: "#00e5ff"
      }}>
        <Image source={source} style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: "#00e5ff" }} />
        <Text style={{ color: "#e6fcff", fontWeight: "700" }}>{displayName}</Text>
      </View>
    </TouchableOpacity>
  );
}
TS

write_file "app/components/CoinPill.tsx" <<'TS'
import React from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@/context/UserContext";

export default function CoinPill() {
  const { coins } = useUser();
  const router = useRouter();
  const goProfile = () => router.push("/(tabs)/account?focus=profile");

  return (
    <TouchableOpacity onPress={goProfile} accessibilityRole="button">
      <View style={{
        backgroundColor: "rgba(0, 255, 255, 0.12)",
        borderColor: "#00e5ff", borderWidth: 1,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 999, shadowColor: "#00e5ff",
        shadowOpacity: 0.5, shadowRadius: 8
      }}>
        <Text style={{ color: "#baf8ff", fontWeight: "700" }}>⭑ {coins} coins</Text>
      </View>
    </TouchableOpacity>
  );
}
TS

write_file "app/components/HeaderBar.tsx" <<'TS'
import React from "react";
import { View } from "react-native";
import CoinPill from "./CoinPill";
import UserBadge from "./UserBadge";

export default function HeaderBar({ left }: { left?: React.ReactNode }) {
  return (
    <View style={{
      paddingTop: 14, paddingBottom: 10, paddingHorizontal: 14,
      backgroundColor: "transparent",
      flexDirection: "row", alignItems: "center", justifyContent: "space-between"
    }}>
      <View>{left}</View>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <UserBadge />
        <CoinPill />
      </View>
    </View>
  );
}
TS

# 5) Root providers
write_file "app/_layout.tsx" <<'TS'
import { Slot } from "expo-router";
import React from "react";
import { UserProvider } from "@/context/UserContext";
import { AchievementsProvider } from "@/context/AchievementsContext";

export default function Root() {
  return (
    <UserProvider>
      <AchievementsProvider>
        <Slot />
      </AchievementsProvider>
    </UserProvider>
  );
}
TS

# 6) Tabs layout (adds Achievements tab; global header)
write_file "app/(tabs)/_layout.tsx" <<'TS'
import { Tabs } from "expo-router";
import React from "react";
import { View, Text } from "react-native";
import HeaderBar from "@/components/HeaderBar";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        header: () => (
          <View style={{ backgroundColor: "transparent" }}>
            <HeaderBar left={<Text style={{ color: "#baf8ff", fontSize: 18, fontWeight: "700" }}>Nova</Text>} />
          </View>
        ),
        tabBarStyle: { backgroundColor: "#030b15", borderTopColor: "#052133" },
        tabBarActiveTintColor: "#00e5ff",
        tabBarInactiveTintColor: "#7ad9e6",
      }}
    >
      <Tabs.Screen name="ask" options={{ title: "Ask" }} />
      <Tabs.Screen name="flashcards" options={{ title: "Cards" }} />
      <Tabs.Screen name="brainteasers" options={{ title: "Teasers" }} />
      <Tabs.Screen name="shop" options={{ title: "Shop" }} />
      <Tabs.Screen name="achievements" options={{ title: "Achievements" }} />
      <Tabs.Screen name="relax" options={{ title: "Relax" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
TS

# 7) Account screen (profile picker + focus=profile scroll)
write_file "app/(tabs)/account.tsx" <<'TS'
import React, { useRef, useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "@/context/UserContext";
import { useLocalSearchParams } from "expo-router";
import { useAchieve } from "@/context/achievements-bridge";

export default function AccountScreen() {
  const { username, setUsername, avatarUri, setAvatarUri, addCoins } = useUser();
  const { unlock } = useAchieve();

  const [regEmail, setRegEmail] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPass2, setRegPass2] = useState("");

  const [logEmail, setLogEmail] = useState("");
  const [logPass, setLogPass] = useState("");

  const params = useLocalSearchParams<{ focus?: string }>();
  const scrollRef = useRef<ScrollView | null>(null);
  const profileY = useRef(0);

  useEffect(() => {
    if (params?.focus === "profile" && scrollRef.current) {
      const t = setTimeout(() => scrollRef.current?.scrollTo({ y: profileY.current, animated: true }), 60);
      return () => clearTimeout(t);
    }
  }, [params?.focus]);

  const onScroll = (_e: NativeSyntheticEvent<NativeScrollEvent>) => {};

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access to set your avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
      unlock("set_avatar");
    }
  };

  const onRegister = async () => {
    if (!regEmail || !regUser || !regPass) return Alert.alert("Missing", "Please fill all fields.");
    if (regPass !== regPass2) return Alert.alert("Passwords", "Passwords do not match.");
    try {
      // TODO: POST /api/register
      setUsername(regUser);
      addCoins(25);
      Alert.alert("Welcome!", "Account created.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Registration failed");
    }
  };

  const onLogin = async () => {
    try {
      // TODO: POST /api/login
      unlock("first_login");
      Alert.alert("Logged in", "Welcome back!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Login failed");
    }
  };

  const onForgot = async () => {
    if (!logEmail) return Alert.alert("Email needed", "Enter your email first.");
    try {
      // TODO: POST /api/forgot
      Alert.alert("Check your inbox", "We sent a reset link if the email exists.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Request failed");
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      style={{ flex: 1, backgroundColor: "#04101c" }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      scrollEventThrottle={16}
    >
      <Text style={{ color: "#baf8ff", fontWeight: "800", fontSize: 22 }}>Account</Text>

      {/* PROFILE */}
      <View
        onLayout={(e) => { profileY.current = e.nativeEvent.layout.y - 10; }}
        style={{ backgroundColor: "rgba(0, 229, 255, 0.06)", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 16, padding: 14 }}
      >
        <Text style={{ color: "#e6fcff", fontWeight: "700", marginBottom: 8 }}>Profile</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Image
            source={avatarUri ? { uri: avatarUri } : require("@/assets/shop/nova_bunny_front.png")}
            style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: "#00e5ff" }}
          />
          <View style={{ flex: 1 }}>
            <TextInput
              placeholder="Username"
              placeholderTextColor="#66b9c6"
              value={username}
              onChangeText={setUsername}
              style={{ color: "#e6fcff", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}
            />
          </View>
          <TouchableOpacity onPress={pickAvatar} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#00e5ff" }}>
            <Text style={{ color: "#baf8ff", fontWeight: "700" }}>Pick avatar</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: "#7ad9e6", marginTop: 8, fontSize: 12 }}>
          Your avatar and username appear on every page next to your coin pill.
        </Text>
      </View>

      {/* REGISTER */}
      <View style={{ backgroundColor: "rgba(0, 229, 255, 0.06)", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 }}>
        <Text style={{ color: "#e6fcff", fontWeight: "700" }}>Register</Text>
        <TextInput placeholder="Email" placeholderTextColor="#66b9c6" value={regEmail} onChangeText={setRegEmail}
          autoCapitalize="none" keyboardType="email-address"
          style={{ color: "#e6fcff", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }} />
        <TextInput placeholder="Username" placeholderTextColor="#66b9c6" value={regUser} onChangeText={setRegUser}
          style={{ color: "#e6fcff", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }} />
        <TextInput placeholder="Password" placeholderTextColor="#66b9c6" value={regPass} onChangeText={setRegPass} secureTextEntry
          style={{ color: "#e6fcff", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }} />
        <TextInput placeholder="Confirm password" placeholderTextColor="#66b9c6" value={regPass2} onChangeText={setRegPass2} secureTextEntry
          style={{ color: "#e6fcff", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }} />
        <TouchableOpacity onPress={onRegister} style={{ alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#00e5ff" }}>
          <Text style={{ color: "#00131a", fontWeight: "800", backgroundColor: "#00bcd4", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
            Create account
          </Text>
        </TouchableOpacity>
        <Text style={{ color: "#7ad9e6", fontSize: 12 }}>
          Passwords are hashed securely on the server (bcrypt/argon2). We never store plaintext.
        </Text>
      </View>

      {/* LOGIN */}
      <View style={{ backgroundColor: "rgba(0, 229, 255, 0.06)", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 }}>
        <Text style={{ color: "#e6fcff", fontWeight: "700" }}>Login</Text>
        <TextInput placeholder="Email" placeholderTextColor="#66b9c6" value={logEmail} onChangeText={setLogEmail}
          autoCapitalize="none" keyboardType="email-address"
          style={{ color: "#e6fcff", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }} />
        <TextInput placeholder="Password" placeholderTextColor="#66b9c6" value={logPass} onChangeText={setLogPass} secureTextEntry
          style={{ color: "#e6fcff", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }} />
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <TouchableOpacity onPress={onLogin} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#00e5ff" }}>
            <Text style={{ color: "#00131a", fontWeight: "800", backgroundColor: "#00bcd4", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onForgot}>
            <Text style={{ color: "#baf8ff", textDecorationLine: "underline" }}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
TS

# 8) Shop (uses images in app/assets/shop — adjust names to match your files)
write_file "app/(tabs)/shop.tsx" <<'TS'
import React, { useMemo } from "react";
import { View, Text, FlatList, Image, TouchableOpacity } from "react-native";
import { useUser } from "@/context/UserContext";
import { useAchieve } from "@/context/achievements-bridge";

type Item = { id: string; name: string; price: number; preview: any; };

const ITEMS: Item[] = [
  { id: "bunny_front", name: "Nova Bunny (Front)", price: 250, preview: require("@/assets/shop/nova_bunny_front.png") },
  { id: "bunny_back",  name: "Nova Bunny (Back)",  price: 250, preview: require("@/assets/shop/nova_bunny_back.png") },
  { id: "stars_pajamas", name: "Stars Pajamas",    price: 400, preview: require("@/assets/shop/stars_pajamas.png") },
  { id: "orb_cursor",   name: "Orb Cursor",        price: 150, preview: require("@/assets/shop/orb_cursor.png") },
  { id: "glitter_cursor", name: "Glitter Cursor",  price: 180, preview: require("@/assets/shop/glitter_cursor.png") },
];

export default function ShopScreen() {
  const { coins, setCoins } = useUser();
  const { unlock, isUnlocked } = useAchieve();
  const data = useMemo(() => ITEMS, []);

  const buy = (item: Item) => {
    if (coins < item.price) return;
    setCoins(coins - item.price);
    if (!isUnlocked("first_purchase")) unlock("first_purchase");
    // TODO: persist purchased inventory
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#04101c" }}>
      <Text style={{ color: "#baf8ff", fontWeight: "800", fontSize: 22, paddingHorizontal: 16, paddingTop: 8 }}>Shop</Text>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12, gap: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <View style={{
            flex: 1, backgroundColor: "rgba(0, 229, 255, 0.06)",
            borderColor: "#00e5ff", borderWidth: 1, borderRadius: 16, padding: 10
          }}>
            <Image source={item.preview} style={{ width: "100%", aspectRatio: 1, borderRadius: 12 }} resizeMode="contain" />
            <Text style={{ color: "#e6fcff", fontWeight: "700", marginTop: 8 }}>{item.name}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
              <Text style={{ color: "#baf8ff" }}>⭑ {item.price}</Text>
              <TouchableOpacity onPress={() => buy(item)} disabled={coins < item.price}
                style={{
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
                  backgroundColor: coins >= item.price ? "#00bcd4" : "#0a2a35",
                  borderWidth: 1, borderColor: "#00e5ff"
                }}>
                <Text style={{ color: "#00131a", fontWeight: "800" }}>
                  {coins >= item.price ? "Buy" : "Need ⭑"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}
TS

# 9) Achievements UI (card + screen)
write_file "app/components/AchievementCard.tsx" <<'TS'
import React from "react";
import { View, Text, Image } from "react-native";
import { Achievement, difficultyColor } from "@/context/AchievementsContext";
import { useAchievements } from "@/context/AchievementsContext";

export default function AchievementCard({ ach }: { ach: Achievement }) {
  const { isUnlocked, unlocked } = useAchievements();
  const got = isUnlocked(ach.id);
  const date = got ? new Date(unlocked[ach.id].unlockedAt).toLocaleDateString() : null;

  return (
    <View style={{
      flex: 1, padding: 12, borderRadius: 16, borderWidth: 2,
      borderColor: difficultyColor(ach.difficulty),
      backgroundColor: "rgba(0, 229, 255, 0.06)",
      opacity: got ? 1 : 0.6
    }}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        {ach.icon ? (
          <Image source={ach.icon} style={{ width: 42, height: 42, borderRadius: 8 }} />
        ) : (
          <View style={{ width: 42, height: 42, borderRadius: 8, borderWidth: 1, borderColor: difficultyColor(ach.difficulty) }} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#e6fcff", fontWeight: "800" }}>{ach.title}</Text>
          <Text style={{ color: "#baf8ff", fontSize: 12 }}>{ach.description}</Text>
        </View>
        <Text style={{ color: "#e6fcff", fontWeight: "800" }}>⭑ {ach.coins}</Text>
      </View>
      <Text style={{ color: got ? "#8ff7ff" : "#7ad9e6", fontSize: 11, marginTop: 8 }}>
        {got ? `Unlocked: ${date}` : "Locked"}
      </Text>
    </View>
  );
}
TS

write_file "app/(tabs)/achievements.tsx" <<'TS'
import React, { useMemo } from "react";
import { View, Text, FlatList } from "react-native";
import { useAchievements } from "@/context/AchievementsContext";
import AchievementCard from "@/components/AchievementCard";

export default function AchievementsScreen() {
  const { all } = useAchievements();
  const data = useMemo(() => all, [all]);

  return (
    <View style={{ flex: 1, backgroundColor: "#04101c", paddingHorizontal: 12, paddingTop: 8 }}>
      <Text style={{ color: "#baf8ff", fontWeight: "800", fontSize: 22, paddingHorizontal: 4, marginBottom: 8 }}>
        Achievements
      </Text>
      <FlatList
        data={data}
        keyExtractor={(a) => a.id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 16, gap: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => <AchievementCard ach={item} />}
      />
    </View>
  );
}
TS

# 10) Tabs header wrapper
write_file "app/(tabs)/_layout.tsx" <<'TS'
import { Tabs } from "expo-router";
import React from "react";
import { View, Text } from "react-native";
import HeaderBar from "@/components/HeaderBar";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        header: () => (
          <View style={{ backgroundColor: "transparent" }}>
            <HeaderBar left={<Text style={{ color: "#baf8ff", fontSize: 18, fontWeight: "700" }}>Nova</Text>} />
          </View>
        ),
        tabBarStyle: { backgroundColor: "#030b15", borderTopColor: "#052133" },
        tabBarActiveTintColor: "#00e5ff",
        tabBarInactiveTintColor: "#7ad9e6",
      }}
    >
      <Tabs.Screen name="ask" options={{ title: "Ask" }} />
      <Tabs.Screen name="flashcards" options={{ title: "Cards" }} />
      <Tabs.Screen name="brainteasers" options={{ title: "Teasers" }} />
      <Tabs.Screen name="shop" options={{ title: "Shop" }} />
      <Tabs.Screen name="achievements" options={{ title: "Achievements" }} />
      <Tabs.Screen name="relax" options={{ title: "Relax" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
TS

echo "✅ All files written.
Next:
1) Make sure these images exist (rename requires if needed):
   app/assets/shop/nova_bunny_front.png
   app/assets/shop/nova_bunny_back.png
   app/assets/shop/stars_pajamas.png
   app/assets/shop/orb_cursor.png
   app/assets/shop/glitter_cursor.png
2) Restart Expo (sometimes need: npx expo start -c).
3) Tap the 'Guest' pill or coin pill → it should auto-scroll Account to Profile."

