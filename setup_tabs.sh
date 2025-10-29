#!/usr/bin/env bash
set -euo pipefail

echo "Setting up clean neon tabs…"

ROOT="app/(tabs)"
mkdir -p "$ROOT"

mkdir -p "app/(tabs)"
cat > "app/(tabs)/_layout.tsx" <<'TSX'
import React from "react";
import { Text } from "react-native";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0b0f12",
          borderTopColor: "#00e5ff",
          borderTopWidth: 1,
          height: 62,
        },
        tabBarActiveTintColor: "#00e5ff",
        tabBarInactiveTintColor: "#7bbfd3",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🏠</Text> }} />
      <Tabs.Screen name="ask" options={{ title: "Ask", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>💬</Text> }} />
      <Tabs.Screen name="flashcards" options={{ title: "Cards", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🧠</Text> }} />
      <Tabs.Screen name="quiz" options={{ title: "Quiz", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>📝</Text> }} />
      <Tabs.Screen name="history" options={{ title: "History", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🕒</Text> }} />
      <Tabs.Screen name="collection" options={{ title: "Collection", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🔖</Text> }} />
      <Tabs.Screen name="shop" options={{ title: "Shop", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🛒</Text> }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>👤</Text> }} />
      <Tabs.Screen name="flashcards/[slug]" options={{ href: null }} />
      <Tabs.Screen name="custom-card/new" options={{ href: null }} />
    </Tabs>
  );
}
TSX

cat > "app/(tabs)/index.tsx" <<'TSX'
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function HomeLanding() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: "#090c10", padding: 20, justifyContent: "center" }}>
      <Text style={{ color: "#eaf6ff", fontSize: 28, fontWeight: "800", marginBottom: 12 }}>
        Nova Tutoring
      </Text>
      <Text style={{ color: "#99e8ff", fontSize: 16, marginBottom: 24 }}>
        Learn faster with neon-clean flashcards, quizzes, and your saved collection.
      </Text>
      <Pressable onPress={() => router.push("/(tabs)/ask")} style={{ backgroundColor:"#0b0f12", borderColor:"#00e5ff", borderWidth:1, borderRadius:14, paddingVertical:14, paddingHorizontal:16, marginBottom:12 }}>
        <Text style={{ color:"#00e5ff", fontSize:16, textAlign:"center", fontWeight:"700" }}>Let’s Learn</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/(tabs)/account")} style={{ backgroundColor:"#0b0f12", borderColor:"#00e5ff", borderWidth:1, borderRadius:14, paddingVertical:14, paddingHorizontal:16 }}>
        <Text style={{ color:"#cfeaff", fontSize:16, textAlign:"center", fontWeight:"600" }}>Login / Account</Text>
      </Pressable>
    </View>
  );
}
TSX

cat > "app/(tabs)/ask.tsx" <<'TSX'
import React from "react";
import { View, Text } from "react-native";
export default function AskTab() {
  return (
    <View style={{ flex:1, backgroundColor:"#090c10", padding:20 }}>
      <Text style={{ color:"#eaf6ff", fontSize:22, fontWeight:"700" }}>Ask</Text>
      <Text style={{ color:"#99e8ff", marginTop:6 }}>Your tutoring chat goes here.</Text>
    </View>
  );
}
TSX

cat > "app/(tabs)/quiz.tsx" <<'TSX'
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function QuizTab() {
  const router = useRouter();
  return (
    <View style={{ flex:1, backgroundColor:"#090c10", padding:20 }}>
      <Text style={{ color:"#eaf6ff", fontSize:22, fontWeight:"700" }}>Quiz</Text>
      <Text style={{ color:"#99e8ff", marginTop:6, marginBottom:16 }}>
        Quizzes will be generated from your selected topic or your collection.
      </Text>
      <Pressable onPress={() => router.push("/(tabs)/flashcards")} style={{ backgroundColor:"#0b0f12", borderColor:"#00e5ff", borderWidth:1, borderRadius:14, paddingVertical:12, paddingHorizontal:16, alignSelf:"flex-start" }}>
        <Text style={{ color:"#00e5ff", fontWeight:"700" }}>Choose Topic</Text>
      </Pressable>
    </View>
  );
}
TSX

cat > "app/(tabs)/history.tsx" <<'TSX'
import React from "react";
import { View, Text } from "react-native";
export default function HistoryTab() {
  return (
    <View style={{ flex:1, backgroundColor:"#090c10", padding:20 }}>
      <Text style={{ color:"#eaf6ff", fontSize:22, fontWeight:"700" }}>History</Text>
      <Text style={{ color:"#99e8ff", marginTop:6 }}>
        Progress & quiz history will appear here (placeholder).
      </Text>
    </View>
  );
}
TSX

cat > "app/(tabs)/shop.tsx" <<'TSX'
import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
export default function ShopTab() {
  return (
    <View style={{ flex:1, backgroundColor:"#090c10", padding:20 }}>
      <Text style={{ color:"#eaf6ff", fontSize:22, fontWeight:"700" }}>Shop</Text>
      <Text style={{ color:"#99e8ff", marginTop:6, marginBottom:12 }}>
        Support development or buy add-ons.
      </Text>
      <Pressable onPress={() => Linking.openURL("https://buymeacoffee.com/sventography")} style={{ backgroundColor:"#0b0f12", borderColor:"#00e5ff", borderWidth:1, borderRadius:14, paddingVertical:14, paddingHorizontal:16, marginBottom: 10 }}>
        <Text style={{ color:"#00e5ff", fontSize:16, textAlign:"center", fontWeight:"700" }}>
          ☕ Buy Me a Coffee
        </Text>
      </Pressable>
    </View>
  );
}
TSX

cat > "app/(tabs)/account.tsx" <<'TSX'
import React from "react";
import { View, Text } from "react-native";
export default function AccountTab() {
  return (
    <View style={{ flex:1, backgroundColor:"#090c10", padding:20 }}>
      <Text style={{ color:"#eaf6ff", fontSize:22, fontWeight:"700" }}>Account</Text>
      <Text style={{ color:"#99e8ff", marginTop:6 }}>Sign in, settings, and preferences.</Text>
    </View>
  );
}
TSX

rm -rf "app/(tabs)/ask/index.tsx" 2>/dev/null || true
rm -rf "app/(tabs)/flashcards/index.tsx" 2>/dev/null || true
rm -rf "app/(tabs)/quiz/index.tsx" 2>/dev/null || true
rm -rf "app/(tabs)/history/index.tsx" 2>/dev/null || true
rm -rf "app/(tabs)/collection/index.tsx" 2>/dev/null || true
rm -rf "app/(tabs)/shop/index.tsx" 2>/dev/null || true
rm -rf "app/(tabs)/account/index.tsx" 2>/dev/null || true

echo "✅ Tabs and screens written."
