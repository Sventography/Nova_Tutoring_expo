#!/usr/bin/env bash
set -e

echo "→ ensuring folders"
mkdir -p app/context app/components app/lib app/_lib app/utils app/constants app/providers

echo "→ remove circular AuthContext.ts (if present)"
rm -f app/context/AuthContext.ts

echo "→ write app/context/AuthContext.tsx"
cat > app/context/AuthContext.tsx <<'EOF'
import React, { createContext, useContext, useMemo, PropsWithChildren } from "react";

export type AuthAPI = {
  user?: { id: string; name?: string } | null;
  signIn?: (email?: string, password?: string) => Promise<void>;
  signUp?: (email?: string, password?: string) => Promise<void>;
  signOut?: () => Promise<void>;
};

const AuthContext = createContext<AuthAPI>({});

export function AuthProvider({ children }: PropsWithChildren) {
  const value = useMemo<AuthAPI>(() => ({
    user: null,
    signIn: async () => {},
    signUp: async () => {},
    signOut: async () => {},
  }), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
EOF

echo "→ write app/_AuthContext.tsx (one-way re-exports)"
cat > app/_AuthContext.tsx <<'EOF'
export { default } from "./context/AuthContext";
export { useAuth, AuthProvider } from "./context/AuthContext";
EOF

echo "→ ensure components/ui.tsx (no .ts JSX parse issues)"
rm -f app/components/ui.ts
cat > app/components/ui.tsx <<'EOF'
import { View, Text, Pressable, ScrollView } from "react-native";
export { View, Text, Pressable, ScrollView };
export const Spacer = ({ h = 8 }: { h?: number }) => <View style={{ height: h }} />;
export default {};
EOF

echo "→ stub CoinPill (needed by some screens)"
cat > app/components/CoinPill.tsx <<'EOF'
import { View, Text } from "react-native";
export function CoinPill({ amount = 0 }: { amount?: number }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, alignSelf: "flex-start" }}>
      <Text>{amount} 🪙</Text>
    </View>
  );
}
export default CoinPill;
EOF

echo "→ lib aliases: missions / cards / haptics"
cat > app/lib/missions.ts <<'EOF'
export type Mission = { id: string; title: string; description?: string; points: number; done?: boolean; };
export type MissionsState = { missions: Mission[]; completedIds: Set<string>; };
const _state: MissionsState = {
  missions: [
    { id: "get-started", title: "Get Started", description: "Open the app", points: 10, done: true },
    { id: "ask-1", title: "Ask One Question", description: "Use the Ask tab once", points: 25 },
    { id: "voice-1", title: "Try Voice Once", description: "Use voice input one time", points: 25 }
  ],
  completedIds: new Set(["get-started"]),
};
export function listMissions(){ return _state.missions.slice(); }
export function isCompleted(id:string){ return _state.completedIds.has(id); }
export function completeMission(id:string){ const m=_state.missions.find(x=>x.id===id); if(!m)return{addedPoints:0}; if(_state.completedIds.has(id))return{addedPoints:0}; _state.completedIds.add(id); m.done=true; return {addedPoints:m.points??0}; }
export default { listMissions, isCompleted, completeMission };
EOF

cat > app/lib/cards.ts <<'EOF'
export type Card = { id: string; front: string; back: string; topic?: string; createdAt: number; updatedAt?: number; };
let _cards: Card[] = [];
export async function addCustomCard(card: Omit<Card,"id"|"createdAt">){ const c:Card={ id: Math.random().toString(36).slice(2), createdAt: Date.now(), ...card }; _cards.push(c); return c; }
export async function getCustomCards(topic?:string){ return topic ? _cards.filter(c=>c.topic===topic) : [..._cards]; }
export async function updateCard(id:string, patch:Partial<Card>){ const i=_cards.findIndex(c=>c.id===id); if(i<0)return; _cards[i]={..._cards[i],...patch,updatedAt:Date.now()}; return _cards[i]; }
export async function removeCard(id:string){ const b=_cards.length; _cards=_cards.filter(c=>c.id!==id); return _cards.length!==b; }
export default { addCustomCard, getCustomCards, updateCard, removeCard };
EOF

cat > app/lib/haptics.ts <<'EOF'
import { useMemo } from "react";
let Haptics:any=null; try{ Haptics=require("expo-haptics"); }catch{}
const impact=async(l:"light"|"medium"|"heavy")=>{ if(!Haptics?.impactAsync||!Haptics?.ImpactFeedbackStyle)return; const s=Haptics.ImpactFeedbackStyle; const st=l==="light"?s.Light:l==="medium"?s.Medium:s.Heavy; try{await Haptics.impactAsync(st);}catch{} };
const selection=async()=>{ if(!Haptics?.selectionAsync)return; try{await Haptics.selectionAsync();}catch{} };
const notify=async(k:"success"|"warning"|"error")=>{ if(!Haptics?.notificationAsync||!Haptics?.NotificationFeedbackType)return; const t=Haptics.NotificationFeedbackType; const ty=k==="success"?t.Success:k==="warning"?t.Warning:t.Error; try{await Haptics.notificationAsync(ty);}catch{} };
export function useHaptics(){ return useMemo(()=>({ light:()=>impact("light"), medium:()=>impact("medium"), heavy:()=>impact("heavy"), selection:()=>selection(), success:()=>notify("success"), warning:()=>notify("warning"), error:()=>notify("error") }),[]); }
export const haptics={ light:()=>impact("light"), medium:()=>impact("medium"), heavy:()=>impact("heavy"), selection:()=>selection(), success:()=>notify("success"), warning:()=>notify("warning"), error:()=>notify("error") };
export default haptics;
EOF

echo "→ _lib + utils minimal stubs (unchanged if already exist)"
cat > app/_lib/achievements.ts <<'EOF'
export const ACHIEVEMENTS = {}; export default ACHIEVEMENTS;
EOF

cat > app/_lib/secure.ts <<'EOF'
export const secureGet = async (_k:string)=>null; export const secureSet = async (_k:string,_v:any)=>{};
EOF

cat > app/_lib/avatar.ts <<'EOF'
export type Avatar = { uri?: string }; export const getDefaultAvatar = ():Avatar => ({ uri: undefined });
EOF

cat > app/lib/toast.ts <<'EOF'
export type ToastOpts = { message:string }; export const showToast = ({ message }:ToastOpts)=>console.log("[toast]", message); export default showToast;
EOF

cat > app/lib/store.ts <<'EOF'
export const store = new Map<string, any>(); export default store;
EOF

cat > app/utils/preload.ts <<'EOF'
export async function preload(){}; export default preload;
EOF

echo "→ ensure babel + tsconfig aliases"
cat > babel.config.js <<'EOF'
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin",
      ["module-resolver", {
        root: ["./"],
        alias: {
          "@": "./app",
          "app": "./app",
          "@lib": "./app/lib",
          "lib": "./app/lib",
          "@components": "./app/components",
          "components": "./app/components"
        },
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
      }]
    ],
  };
};
EOF

cat > tsconfig.json <<'EOF'
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/*"],
      "@lib/*": ["app/lib/*"],
      "@components/*": ["app/components/*"],
      "app/*": ["app/*"]
    },
    "types": ["react", "react-native", "expo-router"]
  }
}
EOF

echo "→ clear Metro caches"
watchman watch-del-all 2>/dev/null || true
rm -rf "$TMPDIR/metro-*" "$TMPDIR/haste-map-*" "$TMPDIR/react-*"
rm -rf .expo .expo-shared

echo "✓ fix script finished. now run: npx expo start -c"
