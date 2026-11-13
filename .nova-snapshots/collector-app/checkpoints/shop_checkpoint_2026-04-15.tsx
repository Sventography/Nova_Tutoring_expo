import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  LayoutAnimation,
  Animated,
  Modal,
  Dimensions,
  PanResponder,
  Platform,
  Alert,
  UIManager,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { Linking as RNLinking } from "react-native";
import * as Haptics from "expo-haptics";

import { useCoins } from "../context/CoinsContext";
import { useTheme } from "../context/ThemeContext";
import { useCursor } from "../context/CursorContext";
import { useUser } from "../context/UserContext";
import { usePurchases } from "../context/PurchasesContext";
import { useCompanion } from "../context/CompanionContext";

import {
  catalog,
  CATEGORY_BORDER,
  dollarsToCoins,
  altImages,
  type Category,
  type CatalogItem,
} from "../_lib/catalog";

import { getSizesFor } from "../constants/sizes";
import useSelectedSizes from "../utils/useSelectedSizes";

import * as QuickRowNS from "../components/QuickRow";
const QuickRow = (QuickRowNS as any).default ?? (QuickRowNS as any).QuickRow;

import * as SizeSelectorNS from "../components/SizeSelector";
const SizeSelector =
  (SizeSelectorNS as any).default ?? (SizeSelectorNS as any).SizeSelector;

import * as InsufficientCoinsModalNS from "../components/InsufficientCoinsModal";
const InsufficientCoinsModal =
  (InsufficientCoinsModalNS as any).default ??
  (InsufficientCoinsModalNS as any).InsufficientCoinsModal;

import { COMPANIONS } from "../_lib/companionsCatalog";
import { canonId } from "../_lib/canonId";

import { startCheckout } from "../utils/checkout";
import { startCoinCheckout } from "../utils/coinCheckout";
import { notifyCoinOrder } from "../utils/coin-order";

import AddressSheet, { AddressPayload } from "../components/AddressSheet";
import { supabase } from "../lib/supabase";



let InAppPurchases: any = null;

function showIapDebug(step: string, extra?: any) {
  const detail =
    typeof extra === "string"
      ? extra
      : extra
      ? JSON.stringify(extra, null, 2)
      : "";

  console.log(`[IAP DEBUG] ${step}`, detail || "No extra details");
}

function isAlreadyConnectedError(error: any) {
  const msg = String(error?.message || error || "").toLowerCase();
  return (
    msg.includes("already connected") ||
    msg.includes("already connected to app store")
  );
}

async function getInAppPurchasesSafe() {
  if (InAppPurchases) {
    console.log("[IAP DEBUG] using cached InAppPurchases module");
    return InAppPurchases;
  }

  if (Platform.OS === "web") {
    console.log("[IAP DEBUG] web platform detected; IAP unavailable on web");
    return null;
  }

  try {
    console.log("[IAP DEBUG] attempting dynamic import of expo-in-app-purchases");
    showIapDebug("import_start");

    const mod: any = await import("expo-in-app-purchases");
    const api = mod?.default ?? mod;

    console.log("[IAP DEBUG] import success:", {
      hasDefault: !!mod?.default,
      hasConnectAsync: typeof api?.connectAsync === "function",
      hasGetProductsAsync: typeof api?.getProductsAsync === "function",
      hasPurchaseItemAsync: typeof api?.purchaseItemAsync === "function",
      hasFinishTransactionAsync:
        typeof api?.finishTransactionAsync === "function",
      hasSetPurchaseListener: typeof api?.setPurchaseListener === "function",
      keys: Object.keys(api || {}),
    });

    showIapDebug("import_success", {
      hasConnectAsync: typeof api?.connectAsync,
      hasGetProductsAsync: typeof api?.getProductsAsync,
      hasPurchaseItemAsync: typeof api?.purchaseItemAsync,
      hasFinishTransactionAsync: typeof api?.finishTransactionAsync,
    });

    InAppPurchases = api;
    return api;
  } catch (e) {
    console.log("[Shop] expo-in-app-purchases unavailable in this build");
    console.log("[IAP DEBUG] dynamic import failed:", e);
    showIapDebug("import_failed", String(e));
    return null;
  }
}

async function isIapAvailable() {
  const mod = await getInAppPurchasesSafe();

  const available = !!(
    mod &&
    typeof mod.connectAsync === "function" &&
    typeof mod.getProductsAsync === "function" &&
    typeof mod.purchaseItemAsync === "function" &&
    typeof mod.finishTransactionAsync === "function"
  );

  console.log("[IAP DEBUG] isIapAvailable result:", {
    available,
    hasModule: !!mod,
    connectAsync: typeof mod?.connectAsync,
    getProductsAsync: typeof mod?.getProductsAsync,
    purchaseItemAsync: typeof mod?.purchaseItemAsync,
    finishTransactionAsync: typeof mod?.finishTransactionAsync,
  });

  return available;
}

type QuickItem = {
  id: string;
  name: string;
  kind: "theme" | "cursor";
  owned: boolean;
  equipped: boolean;
};

type Order = {
  id: string;
  sku: string;
  title: string;
  status: "paid" | "fulfilled" | "shipped";
  createdAt: number;
};

type CompanionEffectType =
  | "hearts"
  | "stars"
  | "stardust"
  | "sparkles"
  | "orbs"
  | "balloons"
  | "moons"
  | "books"
  | "fire"
  | "party_confetti"
  | "party_streamers"
  | "shield"
  | "legend_fire"
  | "legend_lightning"
  | "legend_bubbles"
  | "legend_sparkles"
  | "legend_spiral"
  | null;

type AskMemoryConfig = {
  tier: string;
  limit: number;
};

type IapUnavailableReason = "module_missing" | "connect_failed";

const ORDERS_KEY = "@nova/orders";

const REQUIRES_SHIPPING = new Set<Category>([
  "plushies",
  "clothing",
  "tangibles",
]);

const NEON_BORDER = "#00E5FF";

// Companion IAP lock is OFF so every digital item can use the same Apple IAP path.
// Leave this false for the "make all digital items open IAP" build.
const STRICT_TEST_COMPANION_IAP = false;
const STRICT_TEST_COMPANION_PRODUCT_ID = "companion_nova_bunny_1";
const STRICT_TEST_COMPANION_ITEM_IDS = new Set([
  "companion_nova_bunny",
  "companion_nova_bunny_1",
  "nova_bunny",
]);

function isStrictCompanionTestItem(it: any): boolean {
  const raw = String(it?.id || "").trim();
  if (!raw) return false;
  const normalized = raw.toLowerCase().replace(/[:\-]/g, "_");
  const canonical = String(canonId(raw) || "").toLowerCase().replace(/[:\-]/g, "_");
  return (
    STRICT_TEST_COMPANION_ITEM_IDS.has(raw) ||
    STRICT_TEST_COMPANION_ITEM_IDS.has(normalized) ||
    STRICT_TEST_COMPANION_ITEM_IDS.has(canonical)
  );
}

/**
 * App Store Connect product ID aliases.
 * These let the shop work even if local catalog IDs and ASC product IDs
 * are not identical.
 */
const ASC_PRODUCT_ALIASES: Record<string, string> = {
  // Coin packs
  pack_1k: "coins_1000",
  pack_5k: "coins_5000",
  coins_1000: "coins_1000",
  coins_5000: "coins_5000",

  // Themes
  theme_neon: "theme_neon",
  theme_starry: "theme_starry",
  theme_pink: "theme_pink",
  theme_dark: "theme_dark",
  theme_mint: "theme_mint",
  theme_glitter: "theme_glitter",
  theme_black_gold: "theme_black_gold",
  theme_blackgold: "theme_black_gold",
  theme_crimson: "theme_crimson_dream",
  theme_crimson_dream: "theme_crimson_dream",
  theme_emerald: "theme_emerald_wave",
  theme_emerald_wave: "theme_emerald_wave",
  theme_neon_purple: "theme_neon_purple",
  theme_neonpurple: "theme_neon_purple",
  theme_silver: "theme_silver_frost",
  theme_silver_frost: "theme_silver_frost",

  // Cursors
  cursor_glow: "cursor_glow",
  cursor_orb: "cursor_orb",
  cursor_star_trail: "cursor_star_trail",
  cursor_startrail: "cursor_star_trail",

  // Ask memory
  ask_memory_tier1: "ask_memory_tier1",
  ask_memory_tier2: "ask_memory_tier2",
  ask_memory_tier3: "ask_memory_tier3",
  ask_memory_tier4: "ask_memory_tier4",

  // Ask personalities
  ask_personality_calm_focus: "ask_personality_calm_focus",
  ask_personality_coach: "ask_personality_coach",
  ask_personality_encouraging: "ask_personality_encouraging",
  ask_personality_playful: "ask_personality_playful",
  ask_personality_storyteller: "ask_personality_storyteller",

  // Companions
  companion_balloons: "companion_balloons",
  companion_coins_rain: "companion_coins_rain",
  companion_hearts: "companion_hearts",
  companion_nova_bunny: "companion_nova_bunny_1",
  companion_nova_bunny_1: "companion_nova_bunny_1",
  companion_party_3d: "companion_party_3d",
  companion_party_3d_2: "companion_party_3d_2",
  companion_reading_buddy: "companion_reading_buddy",
  companion_sleepy_moon: "companion_sleepy_moon",
  companion_star_blow: "companion_star_blow",
  companion_star_explode: "companion_star_explode",
  companion_star_throw: "companion_star_throw",
};

function toUnderscoreId(raw: string | null | undefined) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/:/g, "_")
    .replace(/-/g, "_");
}

function resolveStoreProductId(it: any): string | null {
  const explicit =
    (it as any)?.iapProductId ||
    (it as any)?.meta?.iapProductId ||
    (it as any)?.meta?.iapId ||
    null;

  if (explicit) return String(explicit);

  const rawId = String((it as any)?.id || "");
  const canonical = canonId(rawId);
  const rawUnder = toUnderscoreId(rawId);
  const canonUnder = toUnderscoreId(canonical);

  return (
    ASC_PRODUCT_ALIASES[rawId] ||
    ASC_PRODUCT_ALIASES[canonical] ||
    ASC_PRODUCT_ALIASES[rawUnder] ||
    ASC_PRODUCT_ALIASES[canonUnder] ||
    rawUnder ||
    null
  );
}

function normalizeIapProductIdSet(values: Array<string | null | undefined>) {
  const out = new Set<string>();

  for (const value of values) {
    const raw = String(value || "").trim();
    if (!raw) continue;

    const under = toUnderscoreId(raw);
    const canon = canonId(raw);
    const canonUnder = toUnderscoreId(canon);

    const variants = [
      raw,
      under,
      canon,
      canonUnder,
      ASC_PRODUCT_ALIASES[raw],
      ASC_PRODUCT_ALIASES[under],
      ASC_PRODUCT_ALIASES[canon],
      ASC_PRODUCT_ALIASES[canonUnder],
    ].filter(Boolean) as string[];

    for (const variant of variants) {
      const cleaned = String(variant).trim();
      if (cleaned) out.add(cleaned);
    }
  }

  return Array.from(out);
}

function resolveStoreProductIdCandidates(it: any): string[] {
  return normalizeIapProductIdSet([
    (it as any)?.iapProductId,
    (it as any)?.meta?.iapProductId,
    (it as any)?.meta?.iapId,
    (it as any)?.meta?.grantId,
    (it as any)?.id,
    resolveStoreProductId(it),
  ]);
}

function showIapUnavailableAlert(
  reason: IapUnavailableReason = "module_missing"
) {
  const message =
    reason === "connect_failed"
      ? "This build found the in-app purchase module, but it could not connect to Apple’s in-app purchase service right now. If you're testing in TestFlight, make sure your in-app purchases are configured correctly in App Store Connect and try again."
      : "This build could not access the native in-app purchase module. If you're in TestFlight, this usually means the archive was built without the IAP native module or the build is missing the required native setup.";

  Alert.alert("In-app purchases unavailable", message);
}

const COMING_SOON_TEXT = "Coming in the next update!";

function isComingSoon(it: any): boolean {
  return !!(it && it.meta && it.meta.comingSoon);
}

function isLegendaryCompanion(it: any): boolean {
  const coinPrice = (it as any)?.coinPrice ?? (it as any)?.priceCoins ?? 0;
  const usd = (it as any)?.priceUSD ?? 0;
  return it?.category === "companions" && coinPrice === 0 && usd > 0;
}

function getCompanionUsdPrice(it: any): number {
  return (
    (it as any)?.priceUSD ??
    (it as any)?.usdPrice ??
    (it as any)?.meta?.priceUSD ??
    (it as any)?.meta?.usdPrice ??
    3
  );
}

function ComingSoonRibbon() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 10,
        right: -34,
        transform: [{ rotate: "20deg" }],
        backgroundColor: "rgba(148,163,184,0.92)",
        paddingVertical: 6,
        paddingHorizontal: 38,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.35)",
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      }}
    >
      <Text
        style={{
          color: "rgba(15,23,42,0.95)",
          fontWeight: "900",
          fontSize: 10,
          letterSpacing: 0.3,
        }}
      >
        COMING SOON
      </Text>
    </View>
  );
}

function ComingSoonPill({ text }: { text?: string }) {
  return (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.55)",
        backgroundColor: "rgba(15,23,42,0.65)",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: "rgba(148,163,184,0.95)",
          fontSize: 11,
          fontWeight: "800",
          textAlign: "center",
        }}
      >
        {text ?? COMING_SOON_TEXT}
      </Text>
    </View>
  );
}

function toThemeCtxId(id: string | null) {
  if (!id) return null;
  const cid = canonId(id);
  const map: Record<string, string> = {
    "theme:neon": "neon",
    "theme:starry": "theme:starry",
    "theme:pink": "pink",
    "theme:dark": "dark",
    "theme:mint": "mint",
    "theme:glitter": "glitter",
    "theme:blackgold": "theme:blackgold",
    "theme:crimson": "crimson",
    "theme:emerald": "emerald",
    "theme:neonpurple": "theme:neonpurple",
    "theme:silver": "silver",
  };
  return map[cid] ?? (cid.startsWith("theme:") ? cid.slice(6) : cid);
}

const track = (event: string, props?: Record<string, any>) => {
  try {
    (globalThis as any).novaTrack?.(event, props ?? {});
  } catch {}
};

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

async function persistOwnedPurchaseLocally(rawId: string | null | undefined) {
  if (!rawId) return;

  const id = String(rawId);
  const canon = canonId(id) || id;
  const variants = Array.from(
    new Set([
      id,
      canon,
      id.replace(/_/g, "-"),
      id.replace(/-/g, "_"),
      canon.replace(/_/g, "-"),
      canon.replace(/-/g, "_"),
    ].filter(Boolean))
  );

  const arrayKeys = ["@nova/purchases", "@nova/purchases.v2"];

  for (const key of arrayKeys) {
    try {
      const raw = await AsyncStorage.getItem(key);
      const arr = Array.isArray(raw ? JSON.parse(raw) : null)
        ? JSON.parse(raw as string)
        : [];
      let changed = false;
      for (const v of variants) {
        if (!arr.includes(v)) {
          arr.push(v);
          changed = true;
        }
      }
      if (changed) await AsyncStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  }
}

function makeIsOwnedAny(isOwnedFn: (id: string) => boolean) {
  return (raw: string | null | undefined) => {
    if (!raw) return false;
    const a = String(raw);
    const c = canonId(a);

    const swapUnderscoreHyphen = (s: string) =>
      s.includes("_") ? s.replace(/_/g, "-") : s.replace(/-/g, "_");

    const v1 = a;
    const v2 = c;
    const v3 = swapUnderscoreHyphen(a);
    const v4 = swapUnderscoreHyphen(c);

    return isOwnedFn(v1) || isOwnedFn(v2) || isOwnedFn(v3) || isOwnedFn(v4);
  };
}

function makeGrantAny(grantFn: (id: string) => Promise<any> | any) {
  return async (raw: string | null | undefined) => {
    if (!raw) return;
    const a = String(raw);
    const c = canonId(a);

    const swapUnderscoreHyphen = (s: string) =>
      s.includes("_") ? s.replace(/_/g, "-") : s.replace(/-/g, "_");

    const v1 = a;
    const v2 = c;
    const v3 = swapUnderscoreHyphen(a);
    const v4 = swapUnderscoreHyphen(c);

    const seen = new Set<string>();
    for (const v of [v2, v1, v4, v3]) {
      if (!v) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      await grantFn(v);
    }
  };
}

function resolveAskMemoryConfigFromItem(
  it: CatalogItem
): AskMemoryConfig | null {
  const meta = (it as any).meta ?? (it as any).askMemory ?? null;
  if (meta && typeof meta === "object") {
    const tier =
      (meta as any).askMemoryTier ?? (meta as any).tier ?? (meta as any).id;
    const limit =
      (meta as any).askMemoryLimit ?? (meta as any).limit ?? undefined;
    if (tier && typeof limit === "number") {
      return { tier: String(tier), limit };
    }
  }
  return null;
}

function resolveAskPersonalityFromItem(it: CatalogItem): string | null {
  const meta = (it as any).meta ?? null;
  if (meta && typeof meta === "object") {
    const pid =
      (meta as any).personalityId ??
      (meta as any).askPersonality ??
      (meta as any).id;
    return pid ? String(pid) : null;
  }
  return null;
}

async function updateAskMemoryProfile(
  userId: string | null | undefined,
  cfg: AskMemoryConfig | null
) {
  if (!userId || !cfg) return;
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        ask_memory_tier: cfg.tier,
        ask_memory_limit: cfg.limit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .single();

    if (error) {
      console.warn("[shop] ask_memory update error", error);
    } else {
      console.log(
        "[shop] ask_memory updated",
        cfg.tier,
        cfg.limit,
        "for",
        userId
      );
    }
  } catch (e) {
    console.warn("[shop] ask_memory update exception", e);
  }
}

async function updateAskPersonalityProfile(
  userId: string | null | undefined,
  personalityId: string | null
) {
  if (!userId || !personalityId) return;
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        ask_personality: personalityId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .single();

    if (error) {
      console.warn("[shop] ask_personality update error", error);
    } else {
      console.log("[shop] ask_personality updated", personalityId, "for", userId);
    }
  } catch (e) {
    console.warn("[shop] ask_personality update exception", e);
  }
}

function getCompanionAbilityShort(
  id: string | null | undefined
): string | null {
  const v = canonId(id ?? "").replace(/-/g, "_");

  if (v.includes("mecha_owl")) return "+10% achievement coins";
  if (v.includes("chrono_fox")) return "+2 min quiz timer";
  if (v.includes("celestra")) return "+25% streak coins";
  if (v.includes("axolotl_oracle") || v.includes("axolotl"))
    return "Streak shield (1x / 7 days)";
  if (v.includes("astral_nova") || v.includes("astral"))
    return "+500 coins per certificate";
  if (v.includes("aetherwyrm") || v.includes("wyrm"))
    return "+20% coins from all rewards";

  return null;
}

function buildCompanionEffectMap(): Record<string, CompanionEffectType> {
  const map: Record<string, CompanionEffectType> = {};

  const EFFECT_SEQUENCE: CompanionEffectType[] = [
    "hearts",
    "balloons",
    "moons",
    "stardust",
    "sparkles",
    "orbs",
    "stars",
  ];

  let seqIdx = 0;
  let firstPartyAssigned = false;

  (COMPANIONS as any[]).forEach((comp) => {
    const id = canonId(comp?.id ?? "").replace(/-/g, "_");
    const text = `${comp?.title ?? ""} ${comp?.desc ?? ""}`.toLowerCase();
    let type: CompanionEffectType = null;

    if (id.includes("chrono_fox") || text.includes("chrono fox")) {
      type = "legend_fire";
    } else if (id.includes("mecha_owl") || text.includes("mecha owl")) {
      type = "legend_lightning";
    } else if (
      id.includes("axolotl") ||
      text.includes("axolotl") ||
      text.includes("oracle")
    ) {
      type = "shield";
    } else if (id.includes("celestra") || text.includes("celestra")) {
      type = "legend_bubbles";
    } else if (id.includes("astral") || text.includes("astral")) {
      type = "legend_sparkles";
    } else if (
      id.includes("aetherwyrm") ||
      text.includes("aetherwyrm") ||
      text.includes("wyrm")
    ) {
      type = "legend_spiral";
    }

    if (!type) {
      const isParty = text.includes("party");
      if (isParty) {
        if (!firstPartyAssigned) {
          type = "party_confetti";
          firstPartyAssigned = true;
        } else {
          type = "party_streamers";
        }
      } else if (text.includes("balloon")) type = "balloons";
      else if (text.includes("moon") || text.includes("luna")) type = "moons";
      else if (text.includes("stardust") || text.includes("star dust"))
        type = "stardust";
      else if (text.includes("heart") || text.includes("love")) type = "hearts";
      else if (
        text.includes("sparkle") ||
        text.includes("sparkly") ||
        text.includes("glitter")
      )
        type = "sparkles";
      else if (
        text.includes("book") ||
        text.includes("study") ||
        text.includes("reading") ||
        text.includes("reader")
      )
        type = "books";
      else if (
        text.includes("flame") ||
        text.includes("fire") ||
        text.includes("ember")
      )
        type = "fire";
      else if (
        text.includes("orb") ||
        text.includes("nova") ||
        text.includes("star")
      )
        type = "stars";
    }

    if (!type) {
      type = EFFECT_SEQUENCE[seqIdx % EFFECT_SEQUENCE.length];
      seqIdx += 1;
    }

    map[String(comp.id)] = type;
  });

  return map;
}

const COMPANION_EFFECT_MAP = buildCompanionEffectMap();

function getCompanionEffect(id: string): CompanionEffectType {
  return COMPANION_EFFECT_MAP[id] ?? "stars";
}

function isWhiteLegendId(raw: string | null | undefined): boolean {
  const v = canonId(raw ?? "").replace(/[^a-z0-9]+/g, "_");
  return (
    v.includes("mecha_owl") ||
    v.includes("celestra") ||
    v.includes("axolotl_oracle") ||
    v.includes("axolotl")
  );
}

function Section({
  title,
  children,
  pulseAnim,
}: {
  title: string;
  children: React.ReactNode;
  pulseAnim?: Animated.Value | null;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          position: "relative",
          alignSelf: "flex-start",
          borderRadius: 10,
          overflow: "visible",
        }}
      >
        {pulseAnim ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: -8,
              right: -8,
              top: -4,
              bottom: -4,
              borderRadius: 12,
              opacity: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
              backgroundColor: "rgba(0,229,255,0.15)",
            }}
          />
        ) : null}

        <Text
          style={{
            color: tokens.titleText as any,
            fontSize: 16,
            fontWeight: "800",
            marginBottom: 10,
            textShadowColor: tokens.isDark
              ? "transparent"
              : (tokens.softShadow as any),
            textShadowOffset: tokens.isDark
              ? undefined
              : ({ width: 0, height: 1 } as any),
            textShadowRadius: tokens.isDark ? 0 : 2,
          }}
        >
          {title}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          rowGap: 12,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Card({
  children,
  color,
  comingSoon,
}: {
  children: React.ReactNode;
  color: string;
  comingSoon?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        width: "48%",
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: tokens.isDark
          ? "rgba(255,255,255,0.03)"
          : "rgba(255,255,255,0.60)",
        opacity: comingSoon ? 0.62 : 1,
      }}
    >
      <View style={{ position: "relative" }}>
        {comingSoon ? <ComingSoonRibbon /> : null}
        {children}
      </View>
    </View>
  );
}

function OrderSuccessModal({
  visible,
  title,
  onClose,
}: {
  visible: boolean;
  title?: string | null;
  onClose: () => void;
}) {
  const { tokens } = useTheme();
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    glow.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [visible, glow]);

  const shadowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.85],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Animated.View
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 18,
            overflow: "hidden",
            shadowColor: "#00E5FF",
            shadowOpacity: shadowOpacity as any,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <LinearGradient
            colors={["#00111E", "#001D33"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#00E5FF66",
            }}
          >
            <View
              style={{
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: "#00E5FF99",
                backgroundColor: "rgba(0,229,255,0.08)",
              }}
            >
              <Text
                style={{
                  color: "#9ff",
                  fontSize: 20,
                  fontWeight: "900",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                Order Placed ✓
              </Text>

              <Text
                style={{
                  color: tokens.text as any,
                  fontSize: 14,
                  textAlign: "center",
                  opacity: 0.9,
                  marginBottom: 16,
                }}
              >
                {title
                  ? `“${title}” is confirmed. A confirmation was sent to your email.`
                  : "Your order is confirmed. A confirmation was sent to your email."}
              </Text>

              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  alignSelf: "center",
                  minWidth: 160,
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "#00E5FF",
                  backgroundColor: pressed
                    ? "rgba(0,229,255,0.25)"
                    : "rgba(0,229,255,0.15)",
                })}
              >
                <Text style={{ color: "#CFFFFF", fontWeight: "900" }}>
                  Continue
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}
function ItemDetailModal({
  visible,
  item,
  onClose,
  onPrimaryAction,
  primaryLabel,
}: {
  visible: boolean;
  item: any | null;
  onClose: () => void;
  onPrimaryAction?: () => void;
  primaryLabel?: string;
}) {
  const { tokens } = useTheme();
  const [showAlt, setShowAlt] = useState(false);

  useEffect(() => {
    setShowAlt(false);
  }, [item?.id]);

  if (!item) return null;

  const locked = isComingSoon(item) || isLegendaryCompanion(item);

  const hasAlt = !!(item.altImageKey && altImages[item.altImageKey]);
  const imgSrc =
    showAlt && hasAlt
      ? altImages[item.altImageKey]
      : item.image || (hasAlt ? altImages[item.altImageKey] : null);

  const priceCoins = item.priceCoins ?? item.coinPrice ?? null;
  const priceUSD =
    item.category === "companions"
      ? getCompanionUsdPrice(item)
      : item.priceUSD ?? null;

  const abilityShort = getCompanionAbilityShort(item.id);
  const abilityNote = item.ability?.note ?? abilityShort ?? null;

  const isWhiteLegendDetail =
    item.category === "companions" && isWhiteLegendId(item.id);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: tokens.border as any,
            backgroundColor: tokens.isDark
              ? "rgba(15,23,42,0.98)"
              : "rgba(255,255,255,0.98)",
            opacity: locked ? 0.92 : 1,
          }}
        >
          <LinearGradient
            colors={
              tokens.isDark ? ["#020617", "#020617"] : ["#EFF6FF", "#F9FAFB"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 16 }}
          >
            <ScrollView>
              {locked ? (
                <View style={{ marginBottom: 12 }}>
                  <ComingSoonPill />
                </View>
              ) : null}

              {imgSrc ? (
                <View
                  style={{
                    width: "100%",
                    height: 240,
                    borderRadius: 14,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: tokens.border as any,
                    marginBottom: 12,
                    backgroundColor: isWhiteLegendDetail
                      ? "#000"
                      : tokens.isDark
                      ? "rgba(15,23,42,0.98)"
                      : "rgba(255,255,255,0.98)",
                  }}
                >
                  <Image
                    source={imgSrc}
                    style={{
                      width: "100%",
                      height: "100%",
                      opacity: locked ? 0.72 : 1,
                    }}
                    resizeMode="contain"
                  />
                </View>
              ) : null}

              {hasAlt && (
                <Pressable
                  disabled={locked}
                  onPress={() => setShowAlt((v) => !v)}
                  style={({ pressed }) => ({
                    alignSelf: "center",
                    marginBottom: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: tokens.border as any,
                    opacity: locked ? 0.5 : 1,
                    backgroundColor: pressed
                      ? tokens.isDark
                        ? "rgba(148,163,184,0.3)"
                        : "rgba(148,163,184,0.2)"
                      : tokens.isDark
                      ? "rgba(15,23,42,0.9)"
                      : "rgba(255,255,255,0.9)",
                  })}
                >
                  <Text
                    style={{
                      color: tokens.text as any,
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    View {showAlt ? "front" : "back"} art
                  </Text>
                </Pressable>
              )}

              <Text
                style={{
                  color: tokens.titleText as any,
                  fontSize: 18,
                  fontWeight: "900",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                {item.title}
              </Text>

              {item.desc ? (
                <Text
                  style={{
                    color: tokens.text as any,
                    fontSize: 14,
                    lineHeight: 20,
                    marginBottom: 10,
                    textAlign: "left",
                    opacity: locked ? 0.85 : 1,
                  }}
                >
                  {item.desc}
                </Text>
              ) : null}

              {abilityNote ? (
                <Text
                  style={{
                    color: tokens.text as any,
                    fontSize: 13,
                    lineHeight: 18,
                    marginBottom: 10,
                    fontStyle: "italic",
                    opacity: locked ? 0.85 : 1,
                  }}
                >
                  Ability: {abilityNote}
                </Text>
              ) : null}

              {(priceCoins || priceUSD) && !locked ? (
                <View
                  style={{
                    marginTop: 8,
                    marginBottom: 16,
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {priceCoins ? (
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: tokens.border as any,
                      }}
                    >
                      <Text
                        style={{
                          color: tokens.text as any,
                          fontWeight: "800",
                          fontSize: 13,
                        }}
                      >
                        {(priceCoins as number).toLocaleString()} coins
                      </Text>
                    </View>
                  ) : null}

                  {priceUSD ? (
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: tokens.border as any,
                      }}
                    >
                      <Text
                        style={{
                          color: tokens.text as any,
                          fontWeight: "800",
                          fontSize: 13,
                        }}
                      >
                        ${priceUSD.toFixed(2)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginTop: 8,
                  columnGap: 10,
                }}
              >
                {onPrimaryAction && primaryLabel && !locked ? (
                  <Pressable
                    onPress={onPrimaryAction}
                    style={({ pressed }) => ({
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: tokens.border as any,
                      backgroundColor: pressed
                        ? tokens.isDark
                          ? "rgba(56,189,248,0.35)"
                          : "rgba(59,130,246,0.25)"
                        : tokens.isDark
                        ? "rgba(56,189,248,0.25)"
                        : "rgba(59,130,246,0.18)",
                    })}
                  >
                    <Text
                      style={{
                        color: tokens.text as any,
                        fontWeight: "800",
                        fontSize: 14,
                      }}
                    >
                      {primaryLabel}
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => ({
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: tokens.border as any,
                    backgroundColor: pressed
                      ? tokens.isDark
                        ? "rgba(148,163,184,0.25)"
                        : "rgba(148,163,184,0.16)"
                      : tokens.isDark
                      ? "rgba(15,23,42,0.9)"
                      : "rgba(255,255,255,0.9)",
                  })}
                >
                  <Text
                    style={{
                      color: tokens.text as any,
                      fontWeight: "800",
                      fontSize: 14,
                    }}
                  >
                    Close
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

function CompanionEffectOverlay({
  type,
  effectKey,
}: {
  type: CompanionEffectType;
  effectKey: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!type) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: false,
    }).start();
  }, [type, effectKey, anim]);

  if (!type) return null;

  if (type === "shield") {
    const rings = [0, 1, 2];
    return (
      <>
        {rings.map((idx) => {
          const baseSize = 110 + idx * 26;
          const scale = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.35],
          });
          const opacity = anim.interpolate({
            inputRange: [0, 0.4, 1],
            outputRange: [0, 0.8 - idx * 0.2, 0],
          });

          return (
            <Animated.View
              key={`shield-${idx}-${effectKey}`}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: baseSize,
                height: baseSize,
                marginLeft: -baseSize / 2,
                marginTop: -baseSize / 2,
                borderRadius: baseSize / 2,
                borderWidth: 2,
                borderColor: `rgba(96,165,250,${0.7 - idx * 0.2})`,
                opacity,
                transform: [{ scale }],
              }}
            />
          );
        })}
      </>
    );
  }

  if (
    type === "legend_fire" ||
    type === "legend_lightning" ||
    type === "legend_bubbles" ||
    type === "legend_sparkles" ||
    type === "legend_spiral"
  ) {
    if (type === "legend_fire") {
      const tongues = [0, 1, 2, 3, 4, 5, 6];
      const embers = [0, 1, 2, 3];

      return (
        <>
          {tongues.map((idx) => {
            const baseHeight = 50 + idx * 4;
            const baseWidth = 12 + (idx % 3) * 2;
            const offsetX = (idx - tongues.length / 2) * 6;

            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [8, -baseHeight - 16],
            });

            const scaleY = anim.interpolate({
              inputRange: [0, 0.4, 0.8, 1],
              outputRange: [0.4, 1.2, 0.9, 0.5],
            });

            const opacity = anim.interpolate({
              inputRange: [0, 0.3, 0.8, 1],
              outputRange: [0, 1, 0.8, 0],
            });

            return (
              <Animated.View
                key={`lf-tongue-${idx}-${effectKey}`}
                style={{
                  position: "absolute",
                  bottom: 2,
                  left: "50%",
                  width: baseWidth,
                  height: baseHeight,
                  marginLeft: -baseWidth / 2 + offsetX,
                  borderRadius: baseWidth,
                  opacity,
                  transform: [{ translateY }, { scaleY }],
                  backgroundColor: "rgba(239,68,68,0.9)",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 2,
                    right: 2,
                    top: baseHeight * 0.25,
                    borderRadius: baseWidth,
                    backgroundColor: "rgba(252,211,77,0.95)",
                  }}
                />
              </Animated.View>
            );
          })}

          {embers.map((idx) => {
            const size = 6 + (idx % 2) * 2;
            const baseRadius = 40 + idx * 8;
            const angle = (idx / embers.length) * Math.PI * 2;

            const translateX = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.cos(angle) * baseRadius],
            });
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -Math.sin(angle) * baseRadius - 30],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0, 1, 0],
            });

            return (
              <Animated.View
                key={`lf-ember-${idx}-${effectKey}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 40,
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  borderRadius: size / 2,
                  backgroundColor: "rgba(252,211,77,0.95)",
                  opacity,
                  transform: [{ translateX }, { translateY }],
                }}
              />
            );
          })}
        </>
      );
    }

    if (type === "legend_lightning") {
      const bolts = [0, 1];

      const glowOpacity = anim.interpolate({
        inputRange: [0, 0.3, 0.6, 1],
        outputRange: [0, 0.7, 0.2, 0],
      });

      return (
        <>
          <Animated.View
            style={{
              position: "absolute",
              left: "50%",
              bottom: 10,
              width: 120,
              height: 120,
              marginLeft: -60,
              borderRadius: 60,
              backgroundColor: "rgba(250,250,210,0.35)",
              opacity: glowOpacity,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1.1],
                  }),
                },
              ],
            }}
          />

          {bolts.map((idx) => {
            const baseX = idx === 0 ? -8 : 10;
            const baseHeight = 90;
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-10, -100],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.25, 0.6, 1],
              outputRange: [0, 1, 0.8, 0],
            });

            return (
              <Animated.View
                key={`ll-bolt-${idx}-${effectKey}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 10,
                  marginLeft: baseX,
                  opacity,
                  transform: [{ translateY }],
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: 6,
                    height: baseHeight * 0.35,
                    borderRadius: 4,
                    backgroundColor: "rgba(250,250,210,1)",
                    transform: [{ rotate: idx === 0 ? "-18deg" : "10deg" }],
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: -6,
                    top: baseHeight * 0.3,
                    width: 7,
                    height: baseHeight * 0.32,
                    borderRadius: 4,
                    backgroundColor: "rgba(253,224,71,0.95)",
                    transform: [{ rotate: idx === 0 ? "28deg" : "-22deg" }],
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: -2,
                    top: baseHeight * 0.55,
                    width: 5,
                    height: baseHeight * 0.28,
                    borderRadius: 4,
                    backgroundColor: "rgba(234,179,8,0.95)",
                    transform: [{ rotate: idx === 0 ? "-26deg" : "18deg" }],
                  }}
                />
              </Animated.View>
            );
          })}
        </>
      );
    }

    if (type === "legend_bubbles") {
      const bubbles = [0, 1, 2, 3, 4, 5];
      return (
        <>
          {bubbles.map((idx) => {
            const size = 12 + (idx % 3) * 6;
            const offsetX = (idx - 2.5) * 10;
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [4, -110 - idx * 6],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0, 0.9, 0],
            });

            return (
              <Animated.View
                key={`lb-${idx}-${effectKey}`}
                style={{
                  bottom: 10,
                  left: "50%",
                  width: size,
                  height: size,
                  marginLeft: offsetX - size / 2,
                  position: "absolute",
                  borderRadius: size / 2,
                  borderWidth: 1,
                  borderColor: "rgba(191,219,254,0.9)",
                  backgroundColor: "rgba(59,130,246,0.20)",
                  opacity,
                  transform: [{ translateY }],
                }}
              />
            );
          })}
        </>
      );
    }

    if (type === "legend_sparkles") {
      const sparks = [0, 1, 2, 3, 4, 5];
      return (
        <>
          {sparks.map((idx) => {
            const size = 14 + (idx % 2) * 4;
            const radius = 32 + idx * 4;
            const angle = (idx / sparks.length) * Math.PI * 2;

            const translateX = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.cos(angle) * radius],
            });
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -Math.sin(angle) * radius],
            });
            const scale = anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.4, 1.1, 0.4],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0, 1, 0],
            });

            return (
              <Animated.View
                key={`ls-${idx}-${effectKey}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  opacity,
                  backgroundColor: "rgba(251,191,36,0.95)",
                  transform: [
                    { translateX },
                    { translateY },
                    { rotate: "45deg" },
                    { scale },
                  ],
                  borderRadius: 4,
                }}
              />
            );
          })}
        </>
      );
    }

    if (type === "legend_spiral") {
      const rings = [0, 1, 2, 3];
      return (
        <>
          {rings.map((idx) => {
            const baseSize = 80 + idx * 16;
            const rotation = anim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", `${40 + idx * 10}deg`],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0, 0.85 - idx * 0.15, 0],
            });

            return (
              <Animated.View
                key={`lspr-${idx}-${effectKey}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: baseSize,
                  height: baseSize,
                  marginLeft: -baseSize / 2,
                  marginTop: -baseSize / 2,
                  borderRadius: baseSize / 2,
                  borderWidth: 2,
                  borderColor: `rgba(129,140,248,${0.9 - idx * 0.18})`,
                  opacity,
                  transform: [{ rotate: rotation }],
                }}
              />
            );
          })}
        </>
      );
    }
  }

  const icons =
    type === "party_confetti"
      ? ["🎉", "🎊", "🎉", "🎊", "🎉", "🎊"]
      : type === "party_streamers"
      ? ["🎊", "🎉", "🎊", "🎉", "🎊", "🎉"]
      : type === "hearts"
      ? ["💜", "🩷", "❤️", "💙", "💜", "🩵"]
      : type === "stardust"
      ? ["✨", "✧", "⋆", "✦", "✨", "⋆"]
      : type === "sparkles"
      ? ["✨", "💫", "✨", "💫", "✨", "💫"]
      : type === "balloons"
      ? ["🎈", "🎈", "🎉", "🎈", "🎈", "🎉"]
      : type === "moons"
      ? ["🌙", "🌘", "🌖", "🌙", "⭐", "🌙"]
      : type === "orbs"
      ? ["💫", "🟣", "🔮", "💫", "🔮", "🟣"]
      : type === "books"
      ? ["📚", "📖", "📘", "📙", "📗", "📕"]
      : type === "fire"
      ? ["🔥", "🔥", "🔥", "✨", "🔥", "🔥"]
      : ["⭐", "🌟", "⭐", "✦", "✧", "⭐"];

  return (
    <>
      {icons.map((icon, index) => {
        const offsetX = (index - icons.length / 2) * 14;

        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -110 - index * 10],
        });

        const opacity = anim.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, 1, 0],
        });
        const translateX = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, offsetX],
        });

        const fontSize = type === "books" ? 22 : type === "fire" ? 28 : 26;

        return (
          <Animated.Text
            key={`${type}-${index}-${effectKey}`}
            style={{
              position: "absolute",
              bottom: 4,
              fontSize,
              transform: [{ translateY }, { translateX }],
              opacity,
            }}
          >
            {icon}
          </Animated.Text>
        );
      })}
    </>
  );
}

/* --------------------------------- Screen -------------------------------- */
export default function Shop() {
  const { coins, setCoins } = useCoins();
  const { tokens, setThemeById, themeId } = useTheme();
  const { cursorId, setCursorById } = useCursor();
  const { user: currentUser } = useUser() as any;
  const { purchases, isOwned, grant } = usePurchases();
  const {
    activeCompanionId: equippedCompanionId,
    ownedCompanions: ownedCompanionIds,
    equipCompanion,
  } = useCompanion();

  useEffect(() => {
    if (Platform.OS === "android") {
      try {
        if ((UIManager as any)?.setLayoutAnimationEnabledExperimental) {
          (UIManager as any).setLayoutAnimationEnabledExperimental(true);
        }
      } catch {}
    }
  }, []);

  const isOwnedAny = useMemo(() => makeIsOwnedAny(isOwned), [isOwned, purchases]);
  const grantAny = useMemo(() => makeGrantAny(grant), [grant]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [need, setNeed] = useState<number>(0);
  const [showInsufficient, setShowInsufficient] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [lastOrderTitle, setLastOrderTitle] = useState<string | null>(null);

  const [addressVisible, setAddressVisible] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [pendingItem, setPendingItem] = useState<any | null>(null);
  const [pendingSize, setPendingSize] = useState<string | null>(null);

  const [detailItem, setDetailItem] = useState<any | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const sizeCtl = useSelectedSizes();

  const themeSectionY = useRef<number>(0);
  const cursorSectionY = useRef<number>(0);

  const themePulse = useRef(new Animated.Value(0)).current;
  const cursorPulse = useRef(new Animated.Value(0)).current;

  const coinsRef = useRef<number>(coins ?? 0);
  const devTapRef = useRef(0);

  const [stripActiveId, setStripActiveId] = useState<string | null>(null);
  const companionAnim = useRef(new Animated.Value(0)).current;
  const companionScale = companionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  const [floatingCompanion, setFloatingCompanion] = useState<any | null>(null);
  const windowDims = Dimensions.get("window");
  const FLOAT_SIZE = 80;

  const floatBasePos = useRef({
    x: windowDims.width - FLOAT_SIZE - 16,
    y: windowDims.height - FLOAT_SIZE - 160,
  });

  const [floatPos, setFloatPos] = useState({
    x: floatBasePos.current.x,
    y: floatBasePos.current.y,
  });

  const floatScale = useRef(new Animated.Value(1)).current;
  const floatHop = useRef(new Animated.Value(0)).current;
  const floatShake = useRef(new Animated.Value(0)).current;
  const floatRotate = useRef(new Animated.Value(0)).current;

  const floatRotation = floatRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const shakeX = floatShake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-6, 6],
  });

  const clickModeRef = useRef(0);

  const [activeEffect, setActiveEffect] = useState<CompanionEffectType>(null);
  const [effectKey, setEffectKey] = useState(0);

  const pinchDistanceRef = useRef<number | null>(null);
  const pinchBaseScaleRef = useRef<number>(1);
  const pinchScaleRef = useRef<number>(1);
  const MIN_FLOAT_SCALE = 0.7;
  const MAX_FLOAT_SCALE = 1.6;

  const [iapReady, setIapReady] = useState(false);
  const [availableIapProductIds, setAvailableIapProductIds] = useState<string[]>(
    []
  );
  const processedPurchaseIdsRef = useRef<Set<string>>(new Set());
  const pendingIapProductIdRef = useRef<string | null>(null);
  const pendingIapItemRef = useRef<any | null>(null);
  const iapConnectedRef = useRef(false);
  const iapProductsPromiseRef = useRef<Promise<string[]> | null>(null);
  const iapListenerRegisteredRef = useRef(false);
  const purchaseWaitersRef = useRef<
    Map<string, { resolve: (purchase: any | null) => void; timer: ReturnType<typeof setTimeout> }>
  >(new Map());

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = (evt.nativeEvent as any).touches || [];
        if (touches.length === 2) {
          const [t1, t2] = touches;
          const dx = t2.pageX - t1.pageX;
          const dy = t2.pageY - t1.pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          pinchDistanceRef.current = dist;
          pinchBaseScaleRef.current = pinchScaleRef.current;
        } else {
          pinchDistanceRef.current = null;
        }
      },
      onPanResponderMove: (evt, gesture) => {
        const touches = (evt.nativeEvent as any).touches || [];

        if (touches.length === 2) {
          const [t1, t2] = touches;
          const dx = t2.pageX - t1.pageX;
          const dy = t2.pageY - t1.pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (!pinchDistanceRef.current) {
            pinchDistanceRef.current = dist;
            pinchBaseScaleRef.current = pinchScaleRef.current;
            return;
          }

          const rawRatio = dist / pinchDistanceRef.current;
          let nextScale = pinchBaseScaleRef.current * rawRatio;
          nextScale = Math.max(
            MIN_FLOAT_SCALE,
            Math.min(MAX_FLOAT_SCALE, nextScale)
          );

          pinchScaleRef.current = nextScale;
          floatScale.setValue(nextScale);
        } else if (touches.length === 1) {
          const newX = floatBasePos.current.x + gesture.dx;
          const newY = floatBasePos.current.y + gesture.dy;
          setFloatPos({ x: newX, y: newY });
        }
      },
      onPanResponderRelease: (_evt, gesture) => {
        const minX = 8;
        const maxX = windowDims.width - FLOAT_SIZE - 8;
        const minY = 60;
        const maxY = windowDims.height - FLOAT_SIZE - 40;

        let newX = floatBasePos.current.x + gesture.dx;
        let newY = floatBasePos.current.y + gesture.dy;

        newX = Math.min(Math.max(newX, minX), maxX);
        newY = Math.min(Math.max(newY, minY), maxY);

        floatBasePos.current = { x: newX, y: newY };
        setFloatPos({ x: newX, y: newY });
      },
    })
  ).current;

  useEffect(() => {
    coinsRef.current = coins ?? 0;
  }, [coins]);

  const runPulse = (which: "themes" | "cursors") => {
    const anim = which === "themes" ? themePulse : cursorPulse;
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: false,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: false,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: 420,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const scrollTo = (y: number, meta?: { section?: "themes" | "cursors" }) => {
    track("shop_scroll_to_section", { y, ...meta });
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    if (meta?.section) runPulse(meta.section);
  };

  useEffect(() => {
    const mountTs = Date.now();
    track("shop_view", { ts: mountTs });
    return () => {
      const durMs = Date.now() - mountTs;
      track("shop_unview", { duration_ms: durMs });
    };
  }, []);

  const handleDevTitlePress = () => {
    if (!__DEV__) return;

    devTapRef.current += 1;
    const taps = devTapRef.current;

    if (taps % 5 === 0) {
      const bonus = 1_000;
      const cur = coinsRef.current ?? coins ?? 0;
      const nextCoins = cur + bonus;

      coinsRef.current = nextCoins;
      setTimeout(() => {
        void setCoins(nextCoins);
      }, 0);

      track("dev_shop_title_cheat", {
        bonus,
        taps,
      });

      try {
        console.log(
          `[DEV CHEAT] Granted ${
            bonus.toLocaleString?.() ?? bonus
          } coins from Shop title taps`
        );
      } catch {
        console.log("[DEV CHEAT] Granted 1,000 coins from Shop title taps");
      }
    }
  };

  const initialAddressValues = useMemo<Partial<AddressPayload>>(
    () => ({
      name:
        (currentUser as any)?.displayName ||
        (currentUser as any)?.username ||
        (currentUser as any)?.name ||
        "",
      email:
        (currentUser as any)?.contactEmail ||
        (currentUser as any)?.email ||
        "",
    }),
    [
      (currentUser as any)?.displayName,
      (currentUser as any)?.username,
      (currentUser as any)?.name,
      (currentUser as any)?.contactEmail,
      (currentUser as any)?.email,
    ]
  );

  useEffect(() => {
    (async () => {
      const ord = await loadOrders();
      setOrders(ord);

      track("shop_state_hydrated", {
        coins: coinsRef.current ?? coins ?? 0,
        purchases_count: Object.keys(purchases || {}).length,
        cursor: cursorId,
        theme: themeId,
        orders: ord.length,
      });
    })();
  }, []);

  const iapByProductId = useMemo(() => {
    const m: Record<string, any> = {};

    for (const it of catalog) {
      const pid = resolveStoreProductId(it);
      if (pid) {
        m[String(pid)] = {
          ...it,
          iapProductId: pid,
        };
      }
    }

    for (const c of COMPANIONS as any[]) {
      const pid = resolveStoreProductId(c);
      if (pid) {
        m[String(pid)] = {
          id: c.id,
          title: c.title,
          desc: c.desc,
          category: "companions",
          image: c.image,
          priceUSD: getCompanionUsdPrice(c),
          priceCoins: c.coinPrice ?? 25000,
          meta: (c as any)?.meta ?? {},
          iapProductId: pid,
        };
      }
    }

    return m;
  }, []);

  const allIapProductIds = useMemo(() => {
    return Object.keys(iapByProductId).filter(Boolean);
  }, [iapByProductId]);

  const resolveIapCatalogItem = (rawProductId: string | null | undefined) => {
    const pid = String(rawProductId || "").trim();
    if (!pid) return null;

    const exact = iapByProductId[pid];
    if (exact) return exact;

    const under = toUnderscoreId(pid);
    const alias =
      ASC_PRODUCT_ALIASES[pid] ||
      ASC_PRODUCT_ALIASES[under] ||
      ASC_PRODUCT_ALIASES[canonId(pid)] ||
      ASC_PRODUCT_ALIASES[canonId(under)];

    if (alias && iapByProductId[alias]) {
      return iapByProductId[alias];
    }

    const entry = Object.entries(iapByProductId).find(([key, value]) => {
      const keyUnder = toUnderscoreId(key);
      const valuePid = resolveStoreProductId(value as any);
      return (
        key === pid ||
        keyUnder === under ||
        String(valuePid || "") === pid ||
        toUnderscoreId(String(valuePid || "")) === under
      );
    });

    if (entry?.[1]) return entry[1];

    if (
      pendingIapProductIdRef.current &&
      toUnderscoreId(pendingIapProductIdRef.current) === under &&
      pendingIapItemRef.current
    ) {
      return pendingIapItemRef.current;
    }

    if (pendingIapItemRef.current) {
      const pendingResolved = resolveStoreProductId(pendingIapItemRef.current);
      if (pendingResolved && toUnderscoreId(String(pendingResolved)) === under) {
        return pendingIapItemRef.current;
      }
    }

    return null;
  };


  const resolvePurchaseWaiter = (productId: string | null | undefined, purchase: any | null) => {
    const pid = String(productId || "").trim();
    if (!pid) return;

    const waiter = purchaseWaitersRef.current.get(pid);
    if (!waiter) return;

    try {
      clearTimeout(waiter.timer);
    } catch {}

    purchaseWaitersRef.current.delete(pid);
    waiter.resolve(purchase);
  };

  const waitForListenerPurchase = (productId: string, timeoutMs = 45000) => {
    const pid = String(productId || "").trim();
    if (!pid) return Promise.resolve<any | null>(null);

    const existing = purchaseWaitersRef.current.get(pid);
    if (existing) {
      try {
        clearTimeout(existing.timer);
      } catch {}
      purchaseWaitersRef.current.delete(pid);
      existing.resolve(null);
    }

    return new Promise<any | null>((resolve) => {
      const timer = setTimeout(() => {
        purchaseWaitersRef.current.delete(pid);
        resolve(null);
      }, timeoutMs);

      purchaseWaitersRef.current.set(pid, { resolve, timer });
    });
  };

  const clearPurchaseWaiters = () => {
    for (const [, waiter] of purchaseWaitersRef.current.entries()) {
      try {
        clearTimeout(waiter.timer);
      } catch {}
      try {
        waiter.resolve(null);
      } catch {}
    }
    purchaseWaitersRef.current.clear();
  };

  const getRecentHistoryPurchaseForProduct = async (productId: string) => {
    const pid = String(productId || "").trim();
    if (!pid) return null;

    try {
      const fn = InAppPurchases?.getPurchaseHistoryAsync;
      if (typeof fn !== "function") return null;

      const res = await fn.call(InAppPurchases);
      const okCode = InAppPurchases?.IAPResponseCode?.OK;
      if (res?.responseCode !== okCode || !Array.isArray(res?.results)) {
        return null;
      }

      const now = Date.now();
      const match = [...res.results]
        .filter((purchase: any) => String(purchase?.productId || "").trim() === pid)
        .sort((a: any, b: any) => {
          const at = Number(a?.transactionDate || a?.purchaseTime || 0);
          const bt = Number(b?.transactionDate || b?.purchaseTime || 0);
          return bt - at;
        })
        .find((purchase: any) => {
          const ts = Number(purchase?.transactionDate || purchase?.purchaseTime || 0);
          return !ts || Math.abs(now - ts) < 1000 * 60 * 10;
        });

      return match || null;
    } catch (e) {
      console.warn("[IAP] getPurchaseHistoryAsync fallback failed", e);
      return null;
    }
  };

  const getAllHistoryPurchases = async () => {
    try {
      const fn = InAppPurchases?.getPurchaseHistoryAsync;
      if (typeof fn !== "function") return [] as any[];

      const res = await fn.call(InAppPurchases);
      const okCode = InAppPurchases?.IAPResponseCode?.OK;
      if (res?.responseCode !== okCode || !Array.isArray(res?.results)) {
        return [] as any[];
      }

      return res.results as any[];
    } catch (e) {
      console.warn("[IAP] getAllHistoryPurchases failed", e);
      return [] as any[];
    }
  };

  const restoreOwnedPurchasesFromHistory = async (options?: {
    specificProductId?: string | null;
    silent?: boolean;
  }) => {
    const specificPid = String(options?.specificProductId || "").trim();
    const history = await getAllHistoryPurchases();
    if (!history.length) return 0;

    const seen = new Set<string>();
    let restored = 0;

    const eligible = specificPid
      ? history.filter((purchase: any) => {
          const pid = String(purchase?.productId || "").trim();
          return normalizeIapProductIdSet([pid]).some(
            (v) => v === specificPid || normalizeIapProductIdSet([specificPid]).includes(v)
          );
        })
      : history;

    const sorted = [...eligible].sort((a: any, b: any) => {
      const at = Number(a?.transactionDate || a?.purchaseTime || 0);
      const bt = Number(b?.transactionDate || b?.purchaseTime || 0);
      return bt - at;
    });

    for (const purchase of sorted) {
      const pid = String(purchase?.productId || "").trim();
      const item = resolveIapCatalogItem(pid);
      if (!item) continue;

      const dedupeKey = String((item as any)?.id || pid || "");
      if (!dedupeKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      await fulfillDigitalItem(item, pid);
      await persistOwnedPurchaseLocally((item as any)?.id || null);
      await persistOwnedPurchaseLocally((item as any)?.meta?.grantId || null);
      await persistOwnedPurchaseLocally(pid);
      restored += 1;
    }

    if (restored && !options?.silent) {
      Alert.alert(
        "Purchases restored",
        restored === 1
          ? "Your Apple purchase was found and restored in the app."
          : `Your Apple purchases were found and restored in the app (${restored}).`
      );
    }

    return restored;
  };

  const processCompletedIapPurchase = async (purchase: any, fallbackItem?: any) => {
    const productId = String(
      purchase?.productId ||
      pendingIapProductIdRef.current ||
      ""
    ).trim();

    const purchaseId =
      String(purchase?.transactionId || "") ||
      String(purchase?.orderId || "") ||
      `${productId}:${String(purchase?.transactionDate || Date.now())}`;

    if (processedPurchaseIdsRef.current.has(purchaseId)) return;

    const item =
      resolveIapCatalogItem(productId) ||
      fallbackItem ||
      pendingIapItemRef.current;

    if (!item) {
      console.warn("[IAP] Could not resolve purchased item for", productId);
      resolvePurchaseWaiter(productId, purchase);
      return;
    }

    await fulfillDigitalItem(item, productId);
    await persistOwnedPurchaseLocally((item as any)?.id || null);
    await persistOwnedPurchaseLocally((item as any)?.meta?.grantId || null);
    await persistOwnedPurchaseLocally(productId);
    await persistOwnedPurchaseLocally(canonId((item as any)?.id || "") || null);

    processedPurchaseIdsRef.current.add(purchaseId);
    resolvePurchaseWaiter(productId, purchase);

    pendingIapProductIdRef.current = null;
    pendingIapItemRef.current = null;

    try {
      await InAppPurchases.finishTransactionAsync(
        purchase,
        item?.category === "coin_pack"
      );
    } catch (e) {
      console.warn("[IAP] finishTransactionAsync failed", e);
    }

    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {}
  };

  const ensureIapConnected = async () => {
    const mod = await getInAppPurchasesSafe();

    console.log("[IAP DEBUG] ensureIapConnected starting", {
      hasModule: !!mod,
      connectAsync: typeof mod?.connectAsync,
      getProductsAsync: typeof mod?.getProductsAsync,
      purchaseItemAsync: typeof mod?.purchaseItemAsync,
      finishTransactionAsync: typeof mod?.finishTransactionAsync,
      alreadyConnectedRef: iapConnectedRef.current,
    });

    if (
      !mod ||
      typeof mod.connectAsync !== "function" ||
      typeof mod.getProductsAsync !== "function" ||
      typeof mod.purchaseItemAsync !== "function" ||
      typeof mod.finishTransactionAsync !== "function"
    ) {
      console.log("[IAP] unavailable in this runtime");
      console.log("[IAP DEBUG] ensureIapConnected failed before connectAsync");
      showIapDebug("connect_unavailable", {
        hasModule: !!mod,
        connectAsync: typeof mod?.connectAsync,
        getProductsAsync: typeof mod?.getProductsAsync,
        purchaseItemAsync: typeof mod?.purchaseItemAsync,
        finishTransactionAsync: typeof mod?.finishTransactionAsync,
      });
      return false;
    }

    if (iapConnectedRef.current) {
      console.log("[IAP DEBUG] skipping connectAsync because already connected");
      InAppPurchases = mod;
      return true;
    }

    try {
      console.log("[IAP DEBUG] calling connectAsync()");
      showIapDebug("connect_start");
      await mod.connectAsync();
      console.log("[IAP DEBUG] connectAsync success");
      showIapDebug("connect_success");
      InAppPurchases = mod;
      iapConnectedRef.current = true;
      return true;
    } catch (e) {
      if (isAlreadyConnectedError(e)) {
        console.log(
          "[IAP DEBUG] connectAsync reported already connected; treating as success"
        );
        showIapDebug("connect_already_connected");
        InAppPurchases = mod;
        iapConnectedRef.current = true;
        return true;
      }

      console.warn("[IAP] connectAsync failed", e);
      console.log("[IAP DEBUG] connectAsync threw error:", e);
      showIapDebug("connect_failed", String(e));
      return false;
    }
  };

  const fetchIapProducts = async () => {
    if (iapProductsPromiseRef.current) {
      return iapProductsPromiseRef.current;
    }

    iapProductsPromiseRef.current = (async () => {
      console.log("[IAP DEBUG] fetchIapProducts starting");

      const available = await isIapAvailable();
      if (!available) {
        console.log(
          "[IAP DEBUG] fetchIapProducts aborted: isIapAvailable=false"
        );
        setIapReady(false);
        setAvailableIapProductIds([]);
        return [];
      }

      const ok = await ensureIapConnected();
      if (!ok) {
        console.log(
          "[IAP DEBUG] fetchIapProducts aborted: ensureIapConnected=false"
        );
        setIapReady(false);
        setAvailableIapProductIds([]);
        return [];
      }

      try {
        const ids = allIapProductIds;
        if (!ids.length) {
          console.log("[IAP] no product IDs found in catalog");
          console.log("[IAP DEBUG] allIapProductIds is empty");
          showIapDebug("get_products_no_ids");
          setIapReady(true);
          setAvailableIapProductIds([]);
          return [];
        }

        console.log("[IAP DEBUG] getProductsAsync requesting IDs:", ids);
        showIapDebug("get_products_start", ids);

        const res = await InAppPurchases.getProductsAsync(ids);
        const responseCode = res?.responseCode;
        const results = Array.isArray(res?.results) ? res.results : [];

        const returnedIds = results
          .map((p: any) => String(p?.productId || ""))
          .filter(Boolean);

        console.log("[IAP] getProductsAsync responseCode:", responseCode);
        console.log("[IAP] requested IDs:", ids);
        console.log("[IAP] returned IDs:", returnedIds);
        console.log(
          "[IAP DEBUG] raw getProductsAsync results:",
          JSON.stringify(results, null, 2)
        );

        showIapDebug("get_products_result", {
          requested: ids,
          returned: returnedIds,
          responseCode,
        });

        setAvailableIapProductIds(returnedIds);
        setIapReady(true);

        track("shop_iap_products_loaded", {
          requested: ids.length,
          returned: returnedIds.length,
          responseCode,
        });

        return returnedIds;
      } catch (e) {
        console.warn("[IAP] getProductsAsync failed", e);
        console.log("[IAP DEBUG] getProductsAsync threw error:", e);
        showIapDebug("get_products_failed", String(e));
        setIapReady(false);
        setAvailableIapProductIds([]);
        return [];
      } finally {
        iapProductsPromiseRef.current = null;
      }
    })();

    return iapProductsPromiseRef.current;
  };
    const fulfillDigitalItem = async (it: any, productId?: string) => {
    if (isComingSoon(it)) {
      track("shop_blocked_fulfill_coming_soon", {
        sku: it?.id,
        category: it?.category,
      });
      return;
    }

    if (it.category === "coin_pack") {
      const meta = (it as any)?.meta ?? {};
      const amt =
        meta.coinAmount ??
        (it as any).coinAmount ??
        dollarsToCoins(it.priceUSD ?? 0);

      const cur = coinsRef.current ?? coins ?? 0;
      const nextCoins = cur + (amt || 0);
      coinsRef.current = nextCoins;
      await setCoins(nextCoins);

      showIapDebug("fulfill_success", {
        productId,
        itemId: it.id,
        category: it.category,
      });

      track("shop_coins_added", {
        amount: amt,
        via: "iap",
        sku: it.id,
      });
      return;
    }

    if (it.category === "bundle") {
      const grants: string[] =
        (it as any)?.meta?.bundleGrants ||
        (it as any)?.bundleGrants ||
        [];

      if (Array.isArray(grants) && grants.length) {
        const normalized = grants.map((x) => canonId(x) || x);

        for (const gid of normalized) {
          await grantAny(gid);
          await persistOwnedPurchaseLocally(gid);
        }

        showIapDebug("fulfill_success", {
          productId,
          itemId: it.id,
          category: it.category,
        });

        track("shop_purchase_complete", {
          sku: it.id,
          category: "bundle",
          mode: "iap",
          grants: normalized,
        });

        const firstTheme = normalized.find((x) =>
          String(x).startsWith("theme:")
        );
        const firstCursor = normalized.find((x) =>
          String(x).startsWith("cursor:")
        );

        if (firstTheme)
          equipThemeImmediate(firstTheme, { source: "iap_bundle" });
        if (firstCursor)
          await equipCursorImmediate(firstCursor, { source: "iap_bundle" });

        return;
      }

      const fallbackId = canonId(it.id) || it.id;
      await grantAny(fallbackId);
      await persistOwnedPurchaseLocally(fallbackId);

      showIapDebug("fulfill_success", {
        productId,
        itemId: it.id,
        category: it.category,
      });

      track("shop_purchase_complete", {
        sku: fallbackId,
        category: "bundle",
        mode: "iap",
        note: "bundleGrants missing",
      });
      return;
    }

    const grantIdRaw = (it as any)?.meta?.grantId || it.id;
    const grantId = canonId(grantIdRaw) || grantIdRaw;

    await grantAny(grantId);
    await persistOwnedPurchaseLocally(grantId);
    await persistOwnedPurchaseLocally((it as any)?.id || null);
    await persistOwnedPurchaseLocally(resolveStoreProductId(it));

    showIapDebug("fulfill_success", {
      productId,
      itemId: it.id,
      category: it.category,
    });

    track("shop_purchase_complete", {
      sku: grantId,
      category: it.category,
      mode: "iap",
    });

    if (it.category === "theme")
      equipThemeImmediate(grantId, { source: "iap_purchase" });
    if (it.category === "cursor")
      await equipCursorImmediate(grantId, { source: "iap_purchase" });

    if (it.category === "companions") {
      await equipCompanion(grantId).catch(() => {});
    }

    if (it.category === "ask_memory") {
      const cfg = resolveAskMemoryConfigFromItem(it);
      await updateAskMemoryProfile((currentUser as any)?.id ?? null, cfg);
      if (!cfg)
        console.warn("[shop] ask_memory purchased but meta missing tier/limit");
    }

    if (it.category === "ask_personality") {
      const pid = resolveAskPersonalityFromItem(it);
      await updateAskPersonalityProfile((currentUser as any)?.id ?? null, pid);
      if (!pid)
        console.warn(
          "[shop] ask_personality purchased but meta missing personalityId"
        );
    }
  };

  const buyWithIap = async (it: any) => {
    console.log("[IAP DEBUG] buyWithIap invoked for item:", it?.id);

    if (
      STRICT_TEST_COMPANION_IAP &&
      it?.category === "companions" &&
      !isStrictCompanionTestItem(it)
    ) {
      Alert.alert(
        "Companion IAP test mode",
        "Right now this build is locked to one companion only so we can prove the IAP path works. Please test the Nova Bunny companion first."
      );
      track("shop_iap_companion_test_locked", {
        sku: it?.id,
        category: it?.category,
      });
      return;
    }

    if (isComingSoon(it)) {
      Alert.alert("Coming soon", COMING_SOON_TEXT);
      track("shop_blocked_iap_coming_soon", {
        sku: it?.id,
        category: it?.category,
      });
      return;
    }

    const candidatePids =
      STRICT_TEST_COMPANION_IAP &&
      it?.category === "companions" &&
      isStrictCompanionTestItem(it)
        ? [STRICT_TEST_COMPANION_PRODUCT_ID]
        : resolveStoreProductIdCandidates(it);

    if (!candidatePids.length) {
      Alert.alert(
        "IAP not configured",
        "This item is missing a usable product ID in the catalog."
      );
      track("shop_iap_missing_pid", {
        sku: it?.id,
        category: it?.category,
      });
      return;
    }

    const available = await isIapAvailable();
    if (!available) {
      showIapUnavailableAlert("module_missing");
      return;
    }

    const ok = await ensureIapConnected();
    if (!ok) {
      showIapUnavailableAlert("connect_failed");
      return;
    }

    let storeProducts: any[] = [];
    let returnedIds: string[] = [];
    let responseCode: any = null;

    try {
      const idsToQuery =
        STRICT_TEST_COMPANION_IAP &&
        it?.category === "companions" &&
        isStrictCompanionTestItem(it)
          ? [STRICT_TEST_COMPANION_PRODUCT_ID]
          : Array.from(new Set(candidatePids));

      const res = await InAppPurchases.getProductsAsync(idsToQuery);
      responseCode = res?.responseCode ?? null;
      const results = Array.isArray(res?.results) ? res.results : [];
      storeProducts = results;
      returnedIds = normalizeIapProductIdSet(
        results.map((p: any) => String(p?.productId || "")).filter(Boolean)
      );

      setAvailableIapProductIds(returnedIds);
      setIapReady(true);

      console.log("[IAP DEBUG] buyWithIap full-store getProductsAsync", {
        itemId: it?.id,
        candidatePids,
        requested: idsToQuery,
        returnedIds,
        responseCode,
      });
    } catch (e) {
      console.warn("[IAP] getProductsAsync failed", e);
      Alert.alert(
        "IAP lookup error",
        String((e as any)?.message || e || "Could not query Apple for this item.")
      );
      return;
    }

    const candidateSet = new Set(normalizeIapProductIdSet(candidatePids));
    const eligibleProducts = (
      STRICT_TEST_COMPANION_IAP &&
      it?.category === "companions" &&
      isStrictCompanionTestItem(it)
    )
      ? storeProducts.filter(
          (p: any) => String(p?.productId || "").trim() === STRICT_TEST_COMPANION_PRODUCT_ID
        )
      : storeProducts.filter((p: any) => {
          const pid = String(p?.productId || "").trim();
          if (!pid) return false;
          const variants = normalizeIapProductIdSet([pid]);
          return variants.some((v) => candidateSet.has(v));
        });

    if (!eligibleProducts.length) {
      const msg = `Apple returned 0 matching products for this item.

Item: ${String(
        it?.id || ""
      )}
Candidates: ${candidatePids.join(", ")}
Returned: ${returnedIds.join(", ")}
Response code: ${String(
        responseCode ?? "unknown"
      )}`;
      Alert.alert("IAP unavailable for item", msg);
      track("shop_iap_zero_products", {
        sku: it?.id,
        category: it?.category,
        candidatePids,
        returnedIds,
        responseCode,
      });
      return;
    }

    let lastErrorMessage = "";

    for (const product of eligibleProducts) {
      const pid = String(product?.productId || "").trim();
      if (!pid) continue;

      try {
        pendingIapProductIdRef.current = pid;
        pendingIapItemRef.current = it;

        track("shop_iap_purchase_start", {
          productId: pid,
          sku: it.id,
          category: it.category,
        });

        console.log("[IAP DEBUG] purchaseItemAsync starting", {
          productId: pid,
          itemId: it?.id,
        });

        const purchaseResponse = await InAppPurchases.purchaseItemAsync(pid);

        const okCode = InAppPurchases.IAPResponseCode?.OK;
        const cancelledCode = InAppPurchases.IAPResponseCode?.USER_CANCELED;

        console.log("[IAP DEBUG] purchaseItemAsync response", {
          productId: pid,
          responseCode: purchaseResponse?.responseCode,
          resultCount: Array.isArray(purchaseResponse?.results)
            ? purchaseResponse.results.length
            : 0,
        });

        if (purchaseResponse?.responseCode === cancelledCode) {
          track("shop_iap_cancelled", {
            productId: pid,
            sku: it.id,
          });
          pendingIapProductIdRef.current = null;
          pendingIapItemRef.current = null;
          return;
        }

        if (
          purchaseResponse &&
          purchaseResponse?.responseCode === okCode &&
          Array.isArray(purchaseResponse?.results) &&
          purchaseResponse.results.length
        ) {
          for (const purchase of purchaseResponse.results) {
            await processCompletedIapPurchase(purchase, it);
          }
          return;
        }

        const listenerPurchase = await waitForListenerPurchase(pid, 45000);
        if (listenerPurchase) {
          return;
        }

        const historyPurchase = await getRecentHistoryPurchaseForProduct(pid);
        if (historyPurchase) {
          await processCompletedIapPurchase(historyPurchase, it);
          return;
        }

        console.warn("[IAP] listener timeout after purchaseItemAsync", {
          productId: pid,
          itemId: it?.id,
        });
        lastErrorMessage = `Apple did not return a completed purchase for ${pid}. No listener event arrived within 45 seconds, and purchase history did not contain a recent completed transaction.`;
      } catch (e: any) {
        const msg = String(e?.message || e || "");
        lastErrorMessage = msg;
        console.warn("[IAP] purchaseItemAsync error", pid, e);

        const lower = msg.toLowerCase();
        if (lower.includes("cancel") || lower.includes("user cancelled")) {
          track("shop_iap_cancelled", {
            productId: pid,
            sku: it.id,
          });
          pendingIapProductIdRef.current = null;
          pendingIapItemRef.current = null;
          return;
        }

        if (
          lower.includes("already purchased") ||
          lower.includes("already owned") ||
          lower.includes("duplicate product object")
        ) {
          const restored = await restoreOwnedPurchasesFromHistory({
            specificProductId: pid,
            silent: false,
          });

          if (restored > 0) {
            track("shop_iap_restored_after_already_owned", {
              productId: pid,
              sku: it.id,
              restored,
            });
            pendingIapProductIdRef.current = null;
            pendingIapItemRef.current = null;
            return;
          }
        }
      }
    }

    pendingIapProductIdRef.current = null;
    pendingIapItemRef.current = null;

    Alert.alert(
      "Purchase error",
      lastErrorMessage || "Could not start purchase for any matching product ID."
    );
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      console.log("[IAP DEBUG] listener setup effect starting");

      const mod = await getInAppPurchasesSafe();
      const available = !!(
        mod &&
        typeof mod.connectAsync === "function" &&
        typeof mod.getProductsAsync === "function" &&
        typeof mod.purchaseItemAsync === "function" &&
        typeof mod.finishTransactionAsync === "function"
      );

      if (!available) {
        console.log("[IAP DEBUG] listener setup aborted: IAP unavailable");
        return;
      }

      InAppPurchases = mod;

      if (!iapListenerRegisteredRef.current) {
        try {
          console.log("[IAP DEBUG] registering purchase listener before connectAsync");
          mod.setPurchaseListener?.(async ({ responseCode, results, errorCode }: any) => {
            if (!alive) return;

            const okCode = mod.IAPResponseCode?.OK;
            const cancelledCode = mod.IAPResponseCode?.USER_CANCELED;

            console.log("[IAP DEBUG] purchase listener fired", {
              responseCode,
              errorCode,
              resultCount: Array.isArray(results) ? results.length : 0,
              pendingProductId: pendingIapProductIdRef.current,
            });

            if (responseCode === cancelledCode) {
              track("shop_iap_cancelled", {
                productId: pendingIapProductIdRef.current,
              });
              resolvePurchaseWaiter(pendingIapProductIdRef.current, null);
              pendingIapProductIdRef.current = null;
              pendingIapItemRef.current = null;
              return;
            }

            if (responseCode !== okCode || !Array.isArray(results) || !results.length) {
              return;
            }

            for (const purchase of results) {
              try {
                await processCompletedIapPurchase(
                  purchase,
                  pendingIapItemRef.current || undefined
                );
              } catch (e) {
                console.warn("[IAP] listener error", e);
              }
            }
          });

          iapListenerRegisteredRef.current = true;
        } catch (e) {
          console.warn("[IAP] setPurchaseListener failed", e);
          console.log("[IAP DEBUG] setPurchaseListener threw error:", e);
          showIapDebug("listener_setup_failed", String(e));
        }
      }

      const ok = await ensureIapConnected();
      if (!ok || !alive) {
        console.log("[IAP DEBUG] listener setup aborted after connect attempt:", {
          ok,
          alive,
        });
        return;
      }

      await fetchIapProducts();

      try {
        await restoreOwnedPurchasesFromHistory({ silent: true });
      } catch (e) {
        console.warn("[IAP] initial restoreOwnedPurchasesFromHistory failed", e);
      }
    })();

    return () => {
      alive = false;
      pendingIapProductIdRef.current = null;
      pendingIapItemRef.current = null;
      iapProductsPromiseRef.current = null;
      clearPurchaseWaiters();
    };
  }, [iapByProductId, currentUser?.id]);

  useEffect(() => {
    const onUrl = async (event: { url: string }) => {
      const { queryParams, path } = Linking.parse(event.url);
      const sku = (queryParams?.sku as string) || "";
      track("shop_return_deeplink", { url: event.url, path, sku });
      if (!sku) return;

      const it = catalog.find((x) => x.id === sku);
      if (!it) return;

      const requiresShip =
        REQUIRES_SHIPPING.has(it.category as Category) ||
        (it.category === "bundle" && !!(it as any)?.meta?.requiresShipping);

      if (!requiresShip) {
        console.warn("[shop] Ignoring non-shipping Stripe return for", it.id);
        return;
      }

      const order: Order = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sku: it.id,
        title: it.title,
        status: "paid",
        createdAt: Date.now(),
      };
      setOrders((prev) => {
        const next = [order, ...prev];
        void saveOrders(next);
        track("shop_order_created", { sku: it.id, title: it.title });
        return next;
      });

      setLastOrderTitle(it.title);
      setShowOrderSuccess(true);
    };

    const sub = RNLinking.addEventListener("url", onUrl);
    Linking.getInitialURL().then((url) => url && onUrl({ url }));
    return () => sub.remove();
  }, []);

  async function markOwned(id: string) {
    const grantId = canonId(id) || id;
    await grantAny(grantId);
    track("shop_owned_marked", { id: grantId });
  }

  function equipThemeImmediate(shopThemeId: string, meta?: Record<string, any>) {
    const cid = canonId(shopThemeId);
    const mapped = toThemeCtxId(cid) ?? cid;
    if (typeof setThemeById === "function") setThemeById(mapped);
    track("shop_equip", { kind: "theme", id: cid, mapped, ...meta });
  }

  function unequipThemeImmediate(meta?: Record<string, any>) {
    const prev = themeId;
    if (typeof setThemeById === "function") {
      const def = toThemeCtxId("theme_neon") ?? "neon";
      setThemeById(def as any);
    }
    track("shop_unequip", { kind: "theme", id: prev, ...meta });
  }

  async function equipCursorImmediate(
    shopId: string,
    meta?: Record<string, any>
  ) {
    const cid = canonId(shopId);
    if (typeof setCursorById === "function") {
      await setCursorById(cid);
    }
    track("shop_equip", { kind: "cursor", id: cid, mapped: cid, ...meta });
  }

  async function unequipCursorImmediate(meta?: Record<string, any>) {
    const prev = cursorId;
    if (typeof setCursorById === "function") {
      await setCursorById(null);
    }
    track("shop_unequip", { kind: "cursor", id: prev, ...meta });
  }

  const THEMES_MENU: QuickItem[] = useMemo(() => {
    const eq = canonId(themeId ?? "");
    return [
      {
        id: "theme_neon",
        name: "Neon Nova",
        kind: "theme",
        owned: isOwnedAny("theme_neon"),
        equipped: eq === canonId("theme_neon"),
      },
      {
        id: "theme_starry",
        name: "Starry Night",
        kind: "theme",
        owned: isOwnedAny("theme_starry"),
        equipped: eq === canonId("theme_starry"),
      },
      {
        id: "theme_pink",
        name: "Pink Dawn",
        kind: "theme",
        owned: isOwnedAny("theme_pink"),
        equipped: eq === canonId("theme_pink"),
      },
      {
        id: "theme_dark",
        name: "Dark Nova",
        kind: "theme",
        owned: isOwnedAny("theme_dark"),
        equipped: eq === canonId("theme_dark"),
      },
      {
        id: "theme_mint",
        name: "Mint Breeze",
        kind: "theme",
        owned: isOwnedAny("theme_mint"),
        equipped: eq === canonId("theme_mint"),
      },
      {
        id: "theme_glitter",
        name: "Glitter",
        kind: "theme",
        owned: isOwnedAny("theme_glitter"),
        equipped: eq === canonId("theme_glitter"),
      },
      {
        id: "theme_black_gold",
        name: "Black & Gold",
        kind: "theme",
        owned: isOwnedAny("theme_black_gold"),
        equipped: eq === canonId("theme_black_gold"),
      },
      {
        id: "theme_crimson",
        name: "Crimson Dream",
        kind: "theme",
        owned: isOwnedAny("theme_crimson"),
        equipped: eq === canonId("theme_crimson"),
      },
      {
        id: "theme_emerald",
        name: "Emerald Wave",
        kind: "theme",
        owned: isOwnedAny("theme_emerald"),
        equipped: eq === canonId("theme_emerald"),
      },
      {
        id: "theme_neon_purple",
        name: "Neon Purple",
        kind: "theme",
        owned: isOwnedAny("theme_neon_purple"),
        equipped: eq === canonId("theme_neon_purple"),
      },
      {
        id: "theme_silver",
        name: "Silver Frost",
        kind: "theme",
        owned: isOwnedAny("theme_silver"),
        equipped: eq === canonId("theme_silver"),
      },
    ];
  }, [purchases, themeId, isOwnedAny]);

  const CURSORS_MENU: QuickItem[] = useMemo(() => {
    const eq = canonId(cursorId ?? "");
    return [
      {
        id: "cursor_glow",
        name: "Glow Cursor",
        kind: "cursor",
        owned: isOwnedAny("cursor_glow"),
        equipped: eq === canonId("cursor_glow"),
      },
      {
        id: "cursor_orb",
        name: "Orb Glow",
        kind: "cursor",
        owned: isOwnedAny("cursor_orb"),
        equipped: eq === canonId("cursor_orb"),
      },
      {
        id: "cursor_star_trail",
        name: "Star Trail",
        kind: "cursor",
        owned: isOwnedAny("cursor_star_trail"),
        equipped: eq === canonId("cursor_star_trail"),
      },
    ];
  }, [purchases, cursorId, isOwnedAny]);

  const ownedCompanions = useMemo(
    () =>
      COMPANIONS.filter((c: any) => {
        const cid = canonId(c.id);

        const effectType = getCompanionEffect(c.id);
        const isLegendary =
          effectType === "legend_fire" ||
          effectType === "legend_lightning" ||
          effectType === "legend_bubbles" ||
          effectType === "legend_sparkles" ||
          effectType === "legend_spiral" ||
          effectType === "shield";

        if (isLegendary) return false;

        const fromContext = (ownedCompanionIds || []).some(
          (ownedId: string) => canonId(ownedId) === cid
        );

        const fromPurchases = isOwnedAny(c.id);

        return fromContext || fromPurchases;
      }),
    [ownedCompanionIds, purchases, isOwnedAny]
  );

  function quickEquip(id: string, kind: "theme" | "cursor") {
    const cid = canonId(id);
    const isCurrentlyEq =
      kind === "theme"
        ? canonId(themeId ?? "") === cid
        : canonId(cursorId ?? "") === cid;

    track("shop_quick_action", {
      action: isCurrentlyEq ? "unequip" : "equip",
      id: cid,
      kind,
      source: "quick_row",
    });

    if (kind === "theme") {
      isCurrentlyEq
        ? unequipThemeImmediate({ source: "quick_row" })
        : equipThemeImmediate(cid, { source: "quick_row" });
    } else {
      isCurrentlyEq
        ? void unequipCursorImmediate({ source: "quick_row" })
        : void equipCursorImmediate(cid, { source: "quick_row" });
    }
  }

  function quickBuy(id: string) {
    const cid = canonId(id);
    const kindGuess: "theme" | "cursor" | "other" = cid.startsWith("theme:")
      ? "theme"
      : cid.startsWith("cursor:")
      ? "cursor"
      : "other";

    track("shop_quick_action", {
      action: "unlock_click",
      id: cid,
      kind: kindGuess,
      source: "quick_row",
    });

    if (kindGuess === "theme")
      return scrollTo(themeSectionY.current, { section: "themes" });
    if (kindGuess === "cursor")
      return scrollTo(cursorSectionY.current, { section: "cursors" });

    const it = catalog.find((x) => canonId(x.id) === cid);
    if (it?.priceUSD) {
      void moneyBuy(it);
      return;
    }

    setNeed(1000);
    setShowInsufficient(true);
    track("shop_modal_insufficient_shown", { needed: 1000, via: "quick_row" });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }

  const groups = useMemo(() => {
    const byCat: Record<Category, CatalogItem[]> = {
      plushies: [],
      clothing: [],
      tangibles: [],
      cursor: [],
      theme: [],
      bundle: [],
      coin_pack: [],
      ask_memory: [],
      ask_personality: [],
    };

    for (const it of catalog) {
      byCat[it.category].push(it);
    }
    return byCat;
  }, []);

  function buyWithCoins(it: any, meta?: { size?: string }) {
    const price = it.priceCoins ?? 0;
    if (!price) return;

    if (isComingSoon(it)) {
      Alert.alert("Coming soon", COMING_SOON_TEXT);
      track("shop_blocked_coins_coming_soon", {
        sku: it?.id,
        category: it?.category,
      });
      return;
    }

    if (it.category === "ask_memory" || it.category === "ask_personality") {
      return;
    }

    if (REQUIRES_SHIPPING.has(it.category as Category)) {
      const curCoins = coinsRef.current ?? coins ?? 0;
      if (curCoins < price) {
        setNeed(price - curCoins);
        setShowInsufficient(true);
        track("shop_modal_insufficient_shown", {
          needed: price - curCoins,
          sku: it.id,
          via: "coins_shipping",
        });
        return;
      }

      const sizeKey =
        it.stripeProductId ||
        it.productId ||
        (it.stripe && it.stripe.productId) ||
        it.id;

      const chosen = meta?.size || (getSizesFor(sizeKey)[0] ?? null);

      track("shop_coin_checkout_start", {
        sku: it.id,
        category: it.category,
        price,
        size: chosen || null,
        via: "coins",
        withAddress: true,
      });

      setPendingItem({ ...it, priceCoins: price });
      setPendingSize(chosen);
      setAddressVisible(true);
      return;
    }

    const curCoins = coinsRef.current ?? coins ?? 0;
    if (curCoins < price) {
      setNeed(price - curCoins);
      setShowInsufficient(true);
      track("shop_modal_insufficient_shown", {
        needed: price - curCoins,
        sku: it.id,
        via: "coins",
      });
      return;
    }

    const nextCoins = curCoins - price;
    coinsRef.current = nextCoins;

    if (it.category === "bundle") {
      const grants: string[] =
        (it as any)?.meta?.bundleGrants ||
        (it as any)?.bundleGrants ||
        [];

      if (Array.isArray(grants) && grants.length) {
        const normalized = grants.map((x) => canonId(x) || x);

        void (async () => {
          for (const gid of normalized) {
            await grantAny(gid);
          }

          track("shop_purchase_complete", {
            sku: it.id,
            category: "bundle",
            mode: "coins",
            price,
            grants: normalized,
          });

          const firstTheme = normalized.find((x) =>
            String(x).startsWith("theme:")
          );
          const firstCursor = normalized.find((x) =>
            String(x).startsWith("cursor:")
          );

          if (firstTheme)
            equipThemeImmediate(firstTheme, { source: "coins_bundle" });
          if (firstCursor)
            await equipCursorImmediate(firstCursor, {
              source: "coins_bundle",
            });
        })();

        return;
      }

      const fallbackId = canonId(it.id) || it.id;
      void grantAny(fallbackId);

      track("shop_purchase_complete", {
        sku: fallbackId,
        category: "bundle",
        mode: "coins",
        price,
        note: "bundleGrants missing",
      });

      return;
    }

    const grantIdRaw = (it as any)?.meta?.grantId || it.id;
    const grantId = canonId(grantIdRaw) || grantIdRaw;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void setCoins(nextCoins);
    void grantAny(grantId);

    track("shop_purchase_complete", {
      sku: grantId,
      category: it.category,
      mode: "coins",
      price,
    });

    if (it.category === "theme")
      equipThemeImmediate(grantId, { source: "coins_purchase" });
    if (it.category === "cursor")
      void equipCursorImmediate(grantId, { source: "coins_purchase" });
    if (it.category === "companions")
      void equipCompanion(grantId).catch(() => {});
  }

  async function handleAddressConfirm(addr: AddressPayload) {
    const it = pendingItem;
    if (!it) return;

    try {
      setAddressSubmitting(true);

      const size = pendingSize;
      const priceCoins = it.priceCoins ?? 0;

      const curCoins = coinsRef.current ?? coins ?? 0;
      if (curCoins < priceCoins) {
        setAddressSubmitting(false);
        setAddressVisible(false);
        setPendingItem(null);
        setPendingSize(null);

        setNeed(priceCoins - curCoins);
        setShowInsufficient(true);
        track("shop_modal_insufficient_shown", {
          needed: priceCoins - curCoins,
          sku: it.id,
          via: "coins_address_confirm",
        });
        return;
      }

      const nextCoins = curCoins - priceCoins;
      coinsRef.current = nextCoins;
      await setCoins(nextCoins);

      await markOwned(it.id);

      const userForOrder =
        currentUser &&
        ((currentUser as any).contactEmail ||
          (currentUser as any).email ||
          (currentUser as any).username)
          ? {
              id: (currentUser as any).id,
              username:
                (currentUser as any).username ??
                (currentUser as any).name ??
                undefined,
              displayName:
                (currentUser as any).displayName ??
                (currentUser as any).name ??
                (currentUser as any).username ??
                undefined,
              contactEmail:
                (currentUser as any).contactEmail ??
                (currentUser as any).email ??
                null,
              email:
                (currentUser as any).contactEmail ??
                (currentUser as any).email ??
                null,
            }
          : undefined;

      track("shop_coin_checkout_confirm_address", {
        sku: it.id,
        category: it.category,
        priceCoins,
        size: size || null,
      });

      startCoinCheckout({
        id: it.id,
        title: it.title,
        priceCoins,
        imageUrl: undefined,
        category: it.category,
        size: size || null,
        user: userForOrder,
        address: addr,
      });

      const a: any = addr || {};
      const shippingName =
        addr.name ||
        a.fullName ||
        a.recipient ||
        userForOrder?.displayName ||
        userForOrder?.username ||
        "Nova customer";

      const phone = a.phone || a.contactPhone || a.phoneNumber || "";
      const address1 = a.address1 || a.line1 || a.addressLine1 || "";
      const address2 = a.address2 || a.line2 || a.addressLine2 || "";
      const city = a.city || "";
      const state = a.state || a.region || "";
      const postalCode = a.postalCode || a.zip || "";
      const country = a.country || "";
      const notes = a.notes || "";

      void notifyCoinOrder({
        coins: priceCoins,
        user: userForOrder ?? null,
        item: {
          id: it.id,
          sku: it.id,
          title: it.title,
          category: it.category,
          size: size ?? null,
          quantity: 1,
        },
        sessionId: null,
        shippingName,
        name: shippingName,
        phone,
        contactPhone: phone,
        address1,
        address2,
        city,
        state,
        zip: postalCode,
        postalCode,
        country,
        notes,
        shipping: {
          name: shippingName,
          fullName: shippingName,
          recipient: shippingName,
          phone,
          address1,
          address2,
          city,
          state,
          postalCode,
          country,
          notes,
        },
      } as any);

      const order: Order = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sku: it.id,
        title: it.title,
        status: "paid",
        createdAt: Date.now(),
      };
      setOrders((prev) => {
        const next = [order, ...prev];
        void saveOrders(next);
        track("shop_order_created", {
          sku: it.id,
          title: it.title,
          via: "coins",
        });
        return next;
      });

      setLastOrderTitle(it.title);
      setShowOrderSuccess(true);

      setAddressVisible(false);
      setPendingItem(null);
      setPendingSize(null);
    } catch (e: any) {
      console.log("[coin-order] error", e);
      Alert.alert(
        "Order error",
        e?.message
          ? String(e.message)
          : "Sorry, we couldn’t place your order. Please try again."
      );
    } finally {
      setAddressSubmitting(false);
    }
  }

  async function moneyBuy(it: any, meta?: { size?: string }) {
    try {
      if (isComingSoon(it)) {
        Alert.alert("Coming soon", COMING_SOON_TEXT);
        track("shop_blocked_money_coming_soon", {
          sku: it?.id,
          category: it?.category,
        });
        return;
      }

      const isDigital =
        it.category === "coin_pack" ||
        it.category === "theme" ||
        it.category === "cursor" ||
        it.category === "companions" ||
        it.category === "ask_memory" ||
        it.category === "ask_personality" ||
        (it.category === "bundle" && !(it as any)?.meta?.requiresShipping);

      if (isDigital) {
        if (
          STRICT_TEST_COMPANION_IAP &&
          it.category === "companions" &&
          !isStrictCompanionTestItem(it)
        ) {
          Alert.alert(
            "Companion IAP test mode",
            "This build is focused on one companion only right now. Please tap the Nova Bunny companion for the IAP test."
          );
          return;
        }

        if (
          (it.category === "ask_memory" || it.category === "ask_personality") &&
          !(currentUser && (currentUser as any).id)
        ) {
          Alert.alert(
            "Sign in required",
            "Please sign in or create an account before purchasing Ask upgrades."
          );
          return;
        }

        track("shop_money_buy_click", {
          sku: it.id,
          category: it.category,
          amount: it.priceUSD,
          via: "iap",
        });

        await buyWithIap(it);
        return;
      }

      const amount =
        typeof it.priceUSD === "number" && isFinite(it.priceUSD)
          ? it.priceUSD
          : undefined;

      const sizeKey =
        it.stripeProductId ||
        it.productId ||
        (it.stripe && it.stripe.productId) ||
        it.id;

      const chosen =
        meta?.size || sizeCtl.get(sizeKey) || (getSizesFor(sizeKey)[0] ?? null);

      track("shop_money_buy_click", {
        sku: it.id,
        category: it.category,
        amount,
        via: "stripe_physical",
        size: chosen || null,
      });

      await startCheckout({
        sku: it.id,
        productId: it.stripeProductId || it.productId || undefined,
        priceId: it.stripePriceId || it.priceId || undefined,
        amount,
        currency: "usd",
        quantity: 1,
        meta: {
          size: chosen || null,
          category: it.category,
          title: it.title,
        },
      } as any);
    } catch (e: any) {
      console.error("moneyBuy error", e);
      Alert.alert(
        "Checkout error",
        e?.message
          ? String(e.message)
          : "We couldn't start checkout. Please try again."
      );
    }
  }

  function equipTheme(it: any) {
    if (!isOwnedAny(it.id)) return;
    equipThemeImmediate(it.id, { source: "card_equip" });
  }

  async function equipCursor(it: any) {
    if (!isOwnedAny(it.id)) return;
    await equipCursorImmediate(it.id, { source: "card_equip" });
  }

  function wiggleAction() {
    floatScale.setValue(pinchScaleRef.current);
    Animated.sequence([
      Animated.timing(floatScale, {
        toValue: pinchScaleRef.current * 1.18,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(floatScale, {
        toValue: pinchScaleRef.current * 0.95,
        duration: 110,
        useNativeDriver: false,
      }),
      Animated.timing(floatScale, {
        toValue: pinchScaleRef.current * 1.05,
        duration: 110,
        useNativeDriver: false,
      }),
      Animated.timing(floatScale, {
        toValue: pinchScaleRef.current,
        duration: 110,
        useNativeDriver: false,
      }),
    ]).start();
  }

  function hopAction() {
    floatHop.setValue(0);
    Animated.sequence([
      Animated.timing(floatHop, {
        toValue: -14,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(floatHop, {
        toValue: 0,
        duration: 160,
        useNativeDriver: false,
      }),
    ]).start();
  }

  function spinAction() {
    floatRotate.setValue(0);
    Animated.sequence([
      Animated.timing(floatRotate, {
        toValue: 1,
        duration: 260,
        useNativeDriver: false,
      }),
      Animated.timing(floatRotate, {
        toValue: 0,
        duration: 0,
        useNativeDriver: false,
      }),
    ]).start();
  }

  function shimmyAction() {
    floatShake.setValue(0);
    Animated.sequence([
      Animated.timing(floatShake, {
        toValue: 1,
        duration: 70,
        useNativeDriver: false,
      }),
      Animated.timing(floatShake, {
        toValue: -1,
        duration: 70,
        useNativeDriver: false,
      }),
      Animated.timing(floatShake, {
        toValue: 0.5,
        duration: 60,
        useNativeDriver: false,
      }),
      Animated.timing(floatShake, {
        toValue: 0,
        duration: 60,
        useNativeDriver: false,
      }),
    ]).start();
  }

  function swirlAction() {
    floatScale.setValue(pinchScaleRef.current);
    floatRotate.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(floatScale, {
          toValue: pinchScaleRef.current * 1.2,
          duration: 160,
          useNativeDriver: false,
        }),
        Animated.timing(floatScale, {
          toValue: pinchScaleRef.current * 0.95,
          duration: 140,
          useNativeDriver: false,
        }),
        Animated.timing(floatScale, {
          toValue: pinchScaleRef.current,
          duration: 140,
          useNativeDriver: false,
        }),
      ]),
      Animated.sequence([
        Animated.timing(floatRotate, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(floatRotate, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }

  function handleFloatingPress() {
    clickModeRef.current = (clickModeRef.current + 1) % 5;
    const mode = clickModeRef.current;

    track("companion_click", { mode, id: floatingCompanion?.id });

    switch (mode) {
      case 0:
        wiggleAction();
        break;
      case 1:
        hopAction();
        break;
      case 2:
        spinAction();
        break;
      case 3:
        shimmyAction();
        break;
      case 4:
      default:
        swirlAction();
        break;
    }

    if (activeEffect) setEffectKey((k) => k + 1);
  }

  function triggerCompanion(id: string) {
    const comp = COMPANIONS.find((c: any) => canonId(c.id) === canonId(id));
    if (comp) {
      setFloatingCompanion(comp);
      setActiveEffect(getCompanionEffect(comp.id));

      const dims = Dimensions.get("window");
      const startX = dims.width - FLOAT_SIZE - 16;
      const startY = dims.height - FLOAT_SIZE - 160;

      floatBasePos.current = { x: startX, y: startY };
      setFloatPos({ x: startX, y: startY });

      pinchScaleRef.current = 1;
      pinchBaseScaleRef.current = 1;
      floatScale.setValue(1);

      wiggleAction();
    }

    setStripActiveId(id);
    companionAnim.setValue(0);
    track("companion_triggered", { id: canonId(id) });

    equipCompanion(canonId(id)).catch(() => {});

    Animated.sequence([
      Animated.timing(companionAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: false,
      }),
      Animated.timing(companionAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start(() => setStripActiveId(null));
  }

  const renderItem = (
    it: CatalogItem,
    color: string,
    equipable: "theme" | "cursor" | undefined,
    onOpenDetail: ((item: any) => void) | undefined,
    tokensArg: any
  ) => {
    const owned = isOwnedAny(it.id);
    const src =
      it.image || (it.altImageKey && altImages[it.altImageKey]) || null;

    const sizeKey =
      (it as any).stripeProductId ||
      (it as any).productId ||
      ((it as any).stripe && (it as any).stripe.productId) ||
      it.id;

    let sizes = getSizesFor(sizeKey);
    if (!sizes.length && it.category === "clothing") sizes = ["S", "M", "L", "XL"];
    const selected = sizes.length ? sizeCtl.get(sizeKey) || sizes[0] : null;

    const cid = canonId(it.id);
    const eqTheme = canonId(themeId ?? "");
    const eqCursor = canonId(cursorId ?? "");

    const equipped =
      equipable === "theme"
        ? eqTheme === cid
        : equipable === "cursor"
        ? eqCursor === cid
        : false;

    const tokensLocal = tokensArg;
    const category = it.category;

    const isAskMemory = category === "ask_memory";
    const isAskPersonality = category === "ask_personality";

    const locked = isComingSoon(it) && !owned;

    return (
      <Card key={it.id} color={color} comingSoon={locked}>
        {src ? (
          <Pressable
            onPress={() => onOpenDetail?.(it)}
            onLongPress={() => onOpenDetail?.(it)}
            delayLongPress={180}
            style={{
              width: "100%",
              height: 110,
              borderRadius: 10,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: color,
              marginBottom: 8,
              backgroundColor: tokensLocal.isDark
                ? "rgba(255,255,255,0.02)"
                : "rgba(255,255,255,0.55)",
            }}
          >
            <Image
              source={src}
              style={{
                width: "100%",
                height: "100%",
                opacity: locked ? 0.72 : 1,
              }}
              resizeMode="contain"
            />
          </Pressable>
        ) : null}

        <Text
          style={{
            color: tokensLocal.text as any,
            fontSize: 14,
            fontWeight: "700",
            textAlign: "center",
            opacity: locked ? 0.85 : 1,
          }}
        >
          {it.title}
        </Text>

        {it.desc ? (
          <Text
            style={{
              color: tokensLocal.text as any,
              fontSize: 12,
              lineHeight: 16,
              textAlign: "center",
              marginTop: 16,
              paddingHorizontal: 8,
              opacity: locked ? 0.8 : 1,
            }}
            numberOfLines={3}
          >
            {it.desc}
          </Text>
        ) : null}

        {sizes.length > 0 ? (
          <View
            style={{ marginTop: 10, opacity: locked ? 0.55 : 1 }}
            pointerEvents={locked ? "none" : "auto"}
          >
            <Text
              style={{
                color: tokensLocal.text as any,
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              Size
            </Text>
            <SizeSelector
              sizes={sizes}
              value={selected}
              onChange={async (s: any) => {
                sizeCtl.set(sizeKey, s);
                track("shop_size_change", { sku: it.id, sizeKey, size: s });

                if (it.category === "clothing") {
                  try {
                    await Haptics.selectionAsync();
                  } catch {}
                }
              }}
            />
          </View>
        ) : null}

        <View style={{ height: 8 }} />

        {(isAskMemory || isAskPersonality) && locked ? <ComingSoonPill /> : null}

        {equipable === "theme" ? (
          owned ? (
            <Pressable
              onPress={() =>
                equipped
                  ? unequipThemeImmediate({ source: "card_button" })
                  : equipTheme(it)
              }
              style={({ pressed }) => ({
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: tokensLocal.border as any,
                backgroundColor: pressed
                  ? tokensLocal.isDark
                    ? "rgba(92,252,200,0.15)"
                    : "rgba(62,211,162,0.15)"
                  : tokensLocal.isDark
                  ? "rgba(92,252,200,0.08)"
                  : "rgba(62,211,162,0.08)",
              })}
            >
              <Text style={{ color: tokensLocal.text as any, fontWeight: "800" }}>
                {equipped ? "Equipped ✓" : "Equip"}
              </Text>
            </Pressable>
          ) : (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                columnGap: 8,
                opacity: locked ? 0.6 : 1,
              }}
              pointerEvents={locked ? "none" : "auto"}
            >
              <Pressable
                onPress={() => buyWithCoins(it)}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: color,
                  backgroundColor: "transparent",
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{ color: color, fontWeight: "800" }}>
                  {(it.priceCoins ?? 0).toLocaleString()} coins
                </Text>
              </Pressable>

              <Pressable
                onPress={() => moneyBuy(it)}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: color,
                  backgroundColor: "transparent",
                  opacity: pressed ? 0.9 : 1,
                })}
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
              onPress={() =>
                equipped
                  ? void unequipCursorImmediate({ source: "card_button" })
                  : void equipCursor(it)
              }
              style={({ pressed }) => ({
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: tokensLocal.border as any,
                backgroundColor: pressed
                  ? tokensLocal.isDark
                    ? "rgba(92,252,200,0.15)"
                    : "rgba(62,211,162,0.15)"
                  : tokensLocal.isDark
                  ? "rgba(92,252,200,0.08)"
                  : "rgba(62,211,162,0.08)",
              })}
            >
              <Text style={{ color: tokensLocal.text as any, fontWeight: "800" }}>
                {equipped ? "Equipped ✓" : "Equip"}
              </Text>
            </Pressable>
          ) : (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                columnGap: 8,
                opacity: locked ? 0.6 : 1,
              }}
              pointerEvents={locked ? "none" : "auto"}
            >
              <Pressable
                onPress={() => buyWithCoins(it)}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: color,
                  backgroundColor: "transparent",
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{ color: color, fontWeight: "800" }}>
                  {(it.priceCoins ?? 0).toLocaleString()} coins
                </Text>
              </Pressable>

              <Pressable
                onPress={() => moneyBuy(it)}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: color,
                  backgroundColor: "transparent",
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{ color: color, fontWeight: "800" }}>
                  ${it.priceUSD?.toFixed(0)}
                </Text>
              </Pressable>
            </View>
          )
        ) : category === "coin_pack" ? (
          <Pressable
            onPress={() => moneyBuy(it)}
            style={({ pressed }) => ({
              alignItems: "center",
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: color,
              backgroundColor: pressed
                ? "rgba(245,158,11,0.15)"
                : "rgba(245,158,11,0.08)",
            })}
          >
            <Text style={{ color: color, fontWeight: "800" }}>
              ${it.priceUSD?.toFixed(0)}
            </Text>
          </Pressable>
        ) : isAskMemory || isAskPersonality ? (
          owned ? (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "rgba(34,197,94,0.9)",
                backgroundColor: "rgba(22,163,74,0.16)",
              }}
            >
              <Text
                style={{
                  color: "rgba(22,163,74,0.95)",
                  fontWeight: "800",
                  fontSize: 13,
                }}
              >
                Owned ✓
              </Text>
            </View>
          ) : locked ? (
            <ComingSoonPill />
          ) : (
            <Pressable
              onPress={() => moneyBuy(it)}
              style={({ pressed }) => ({
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: color,
                backgroundColor: pressed
                  ? "rgba(56,189,248,0.20)"
                  : "rgba(56,189,248,0.10)",
              })}
            >
              <Text style={{ color: color, fontWeight: "800" }}>
                ${it.priceUSD?.toFixed(0)}
              </Text>
            </Pressable>
          )
        ) : (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              columnGap: 8,
              opacity: locked ? 0.6 : 1,
            }}
            pointerEvents={locked ? "none" : "auto"}
          >
            <Pressable
              onPress={() => {
                const chosen =
                  sizeCtl.get(sizeKey) || (getSizesFor(sizeKey)[0] ?? null);
                buyWithCoins(it, { size: chosen as any });
              }}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: color,
                backgroundColor: "transparent",
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{ color: color, fontWeight: "800" }}>
                {(it.priceCoins ?? 0).toLocaleString()} coins
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                const chosen =
                  sizeCtl.get(sizeKey) || (getSizesFor(sizeKey)[0] ?? null);
                void moneyBuy(it, { size: chosen as any });
              }}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: color,
                backgroundColor: "transparent",
                opacity: pressed ? 0.9 : 1,
              })}
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

  const isFloatingSquareLegend =
    !!floatingCompanion &&
    isWhiteLegendId(
      (floatingCompanion.canonId || floatingCompanion.id) as string
    );

  const FLOAT_BORDER_RADIUS = isFloatingSquareLegend ? 16 : FLOAT_SIZE / 2;
  const FLOAT_BG_COLOR = isFloatingSquareLegend
    ? "#000"
    : tokens.isDark
    ? "rgba(15,23,42,0.95)"
    : "rgba(255,255,255,0.95)";

  return (
    <LinearGradient
      colors={tokens.gradient as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 32,
          paddingTop: 0,
          marginTop: 16,
        }}
      >
        <View
          data-shop-top-header
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable onPress={handleDevTitlePress} hitSlop={10}>
            <Text
              style={{
                color: tokens.titleText as any,
                fontSize: 24,
                fontWeight: "800",
                textShadowColor: tokens.isDark
                  ? "transparent"
                  : (tokens.softShadow as any),
                textShadowOffset: tokens.isDark
                  ? undefined
                  : ({ width: 0, height: 1 } as any),
                textShadowRadius: tokens.isDark ? 0 : 2,
              }}
            >
              Shop
            </Text>
          </Pressable>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: tokens.pillBorder as any,
              backgroundColor: tokens.pillBg as any,
              shadowColor: "#000",
              shadowOpacity: tokens.isDark ? 0.12 : 0.1,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            }}
          >
            <Text
              style={{
                color: tokens.pillText as any,
                fontSize: 14,
                fontWeight: "800",
              }}
            >
              {(coins ?? 0).toLocaleString()} coins
            </Text>
          </View>
        </View>

        {ownedCompanions.length > 0 && (
          <View style={{ marginTop: 16, marginBottom: 12 }}>
            <Text
              style={{
                color: tokens.titleText as any,
                fontSize: 14,
                fontWeight: "800",
                marginBottom: 6,
              }}
            >
              My Companions
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ownedCompanions.map((it: any) => {
                const cid = canonId(it.id);
                const isActive =
                  equippedCompanionId && canonId(equippedCompanionId) === cid;

                const scale =
                  isActive || stripActiveId === it.id ? companionScale : 1;

                const abilityShort = getCompanionAbilityShort(it.id);

                const baseBorderColor = NEON_BORDER;
                const borderColor = isActive ? "#FACC15" : baseBorderColor;

                const isWhiteLegend = isWhiteLegendId(cid);
                const bubbleRadius = isWhiteLegend ? 12 : 36;

                const bubbleBg = isWhiteLegend
                  ? "#000"
                  : tokens.isDark
                  ? "rgba(15,23,42,0.9)"
                  : "rgba(255,255,255,0.9)";

                return (
                  <Animated.View
                    key={it.id}
                    style={{
                      transform: [{ scale }],
                      marginRight: 12,
                    }}
                  >
                    <Pressable
                      onPress={() => setDetailItem(it)}
                      onLongPress={() => triggerCompanion(it.id)}
                      delayLongPress={180}
                      style={({ pressed }) => ({
                        width: 72,
                        height: 72,
                        borderRadius: bubbleRadius,
                        borderWidth: 4,
                        borderColor,
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: pressed
                          ? isWhiteLegend
                            ? "rgba(0,0,0,0.9)"
                            : "rgba(96,165,250,0.24)"
                          : bubbleBg,
                      })}
                    >
                      {it.image ? (
                        <Image
                          source={it.image}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="contain"
                        />
                      ) : (
                        <View
                          style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                            paddingHorizontal: 4,
                          }}
                        >
                          <Text
                            style={{
                              color: tokens.text as any,
                              fontSize: 11,
                              fontWeight: "700",
                              textAlign: "center",
                            }}
                            numberOfLines={2}
                          >
                            {it.title}
                          </Text>
                        </View>
                      )}
                    </Pressable>

                    <Text
                      style={{
                        color: tokens.text as any,
                        fontSize: 11,
                        fontWeight: "600",
                        marginTop: 4,
                        maxWidth: 80,
                      }}
                      numberOfLines={1}
                    >
                      {it.shortLabel || it.title}
                    </Text>

                    {abilityShort && (
                      <Text
                        style={{
                          color: "#FDE68A",
                          fontSize: 9,
                          fontWeight: "700",
                          marginTop: 2,
                          maxWidth: 90,
                        }}
                        numberOfLines={2}
                      >
                        {abilityShort}
                      </Text>
                    )}

                    {isActive && (
                      <Text
                        style={{
                          color: "#FACC15",
                          fontSize: 10,
                          fontWeight: "800",
                          marginTop: 2,
                          textAlign: "center",
                        }}
                      >
                        Equipped
                      </Text>
                    )}
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View data-quick-rows style={{ marginVertical: 16 }}>
          <QuickRow
            title="Themes"
            items={THEMES_MENU}
            onEquip={quickEquip}
            onBuy={quickBuy}
          />
          <QuickRow
            title="Cursors"
            items={CURSORS_MENU}
            onEquip={quickEquip}
            onBuy={quickBuy}
          />
        </View>

        <Section title="Plushies">
          {groups.plushies.map((it) =>
            renderItem(
              it,
              CATEGORY_BORDER.plushies,
              undefined,
              setDetailItem,
              tokens
            )
          )}
        </Section>

        <Section title="Clothing">
          {groups.clothing.map((it) =>
            renderItem(
              it,
              CATEGORY_BORDER.clothing,
              undefined,
              setDetailItem,
              tokens
            )
          )}
        </Section>

        <Section title="Tangibles">
          {groups.tangibles.map((it) =>
            renderItem(
              it,
              CATEGORY_BORDER.tangibles,
              undefined,
              setDetailItem,
              tokens
            )
          )}
        </Section>

        <Section title="Companions">
          {COMPANIONS.map((it: any) => {
            const cid = canonId(it.id);

            const owned =
              isOwnedAny(it.id) ||
              (ownedCompanionIds || []).some(
                (ownedId: string) => canonId(ownedId) === cid
              );

            const isEquipped =
              equippedCompanionId && canonId(equippedCompanionId) === cid;

            const src = it.image;
            const priceCoins = it.coinPrice ?? 25000;
            const priceUSD = getCompanionUsdPrice(it);

            const effectType = getCompanionEffect(it.id);
            const isLegendary =
              effectType === "legend_fire" ||
              effectType === "legend_lightning" ||
              effectType === "legend_bubbles" ||
              effectType === "legend_sparkles" ||
              effectType === "legend_spiral" ||
              effectType === "shield";

            const isWhiteLegend = isWhiteLegendId(cid);
            const abilityShort = getCompanionAbilityShort(it.id);

            const baseBorderColor = isLegendary
              ? "#22E5FF"
              : CATEGORY_BORDER.tangibles;
            const equippedBorderColor = "#FACC15";
            const borderColor = isEquipped ? equippedBorderColor : baseBorderColor;

            const legendImageOpacity = isLegendary ? 0.5 : 1;
            const legendTextColor = isLegendary
              ? "rgba(148,163,184,0.95)"
              : (tokens.text as any);

            if (owned && !isLegendary) return null;

            const comingSoon = isLegendary;

            return (
              <Card key={it.id} color={borderColor} comingSoon={comingSoon}>
                {src ? (
                  <Pressable
                    onPress={() => setDetailItem(it)}
                    onLongPress={() => setDetailItem(it)}
                    delayLongPress={180}
                    style={{
                      width: "100%",
                      height: 110,
                      borderRadius: 10,
                      overflow: "hidden",
                      borderWidth: isLegendary ? 2 : 1,
                      borderColor,
                      marginBottom: 8,
                      backgroundColor:
                        isLegendary && isWhiteLegend
                          ? "#000"
                          : tokens.isDark
                          ? "rgba(15,23,42,0.98)"
                          : "rgba(255,255,255,0.95)",
                    }}
                  >
                    <Image
                      source={src}
                      style={{
                        width: "100%",
                        height: "100%",
                        opacity: legendImageOpacity,
                      }}
                      resizeMode="contain"
                    />
                  </Pressable>
                ) : null}

                <Text
                  style={{
                    color: legendTextColor,
                    fontSize: 14,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  {it.title}
                </Text>

                {it.desc ? (
                  <Text
                    style={{
                      color: legendTextColor,
                      fontSize: 12,
                      lineHeight: 16,
                      textAlign: "center",
                      marginTop: 8,
                      paddingHorizontal: 6,
                    }}
                    numberOfLines={3}
                  >
                    {it.desc}
                  </Text>
                ) : null}

                {abilityShort && (
                  <Text
                    style={{
                      color: isLegendary ? "#FDE68A" : legendTextColor,
                      fontSize: 11,
                      fontWeight: "700",
                      marginTop: 6,
                      textAlign: "center",
                    }}
                    numberOfLines={2}
                  >
                    Ability: {abilityShort}
                  </Text>
                )}

                <View style={{ height: 8 }} />

                {isLegendary ? (
                  <ComingSoonPill />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      columnGap: 8,
                    }}
                  >
                    <Pressable
                      onPress={() =>
                        buyWithCoins(
                          { ...it, category: "companions", priceCoins },
                          {}
                        )
                      }
                      style={({ pressed }) => ({
                        flex: 1,
                        alignItems: "center",
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor,
                        backgroundColor: pressed
                          ? "rgba(56,189,248,0.20)"
                          : "rgba(56,189,248,0.10)",
                      })}
                    >
                      <Text
                        style={{
                          color: borderColor,
                          fontWeight: "800",
                          fontSize: 12,
                        }}
                      >
                        {priceCoins.toLocaleString()} coins
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        moneyBuy(
                          { ...it, category: "companions", priceUSD },
                          {}
                        )
                      }
                      style={({ pressed }) => ({
                        flex: 1,
                        alignItems: "center",
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor,
                        backgroundColor: pressed
                          ? "rgba(56,189,248,0.16)"
                          : "transparent",
                      })}
                    >
                      <Text
                        style={{
                          color: borderColor,
                          fontWeight: "800",
                          fontSize: 12,
                        }}
                      >
                        ${priceUSD.toFixed(2)}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            );
          })}
        </Section>

        <View
          onLayout={(e) => {
            themeSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <Section title="Themes" pulseAnim={themePulse}>
            {groups.theme.map((it) =>
              renderItem(
                it,
                CATEGORY_BORDER.theme,
                "theme",
                setDetailItem,
                tokens
              )
            )}
          </Section>
        </View>

        <View
          onLayout={(e) => {
            cursorSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <Section title="Cursors" pulseAnim={cursorPulse}>
            {groups.cursor.map((it) =>
              renderItem(
                it,
                CATEGORY_BORDER.cursor,
                "cursor",
                setDetailItem,
                tokens
              )
            )}
          </Section>
        </View>

        <Section title="Ask Memory Upgrades">
          {groups.ask_memory.map((it) =>
            renderItem(
              it,
              CATEGORY_BORDER.ask_memory,
              undefined,
              setDetailItem,
              tokens
            )
          )}
        </Section>

        <Section title="Ask Personalities">
          {groups.ask_personality.map((it) =>
            renderItem(
              it,
              CATEGORY_BORDER.ask_personality,
              undefined,
              setDetailItem,
              tokens
            )
          )}
        </Section>

        <Section title="Coin Packs">
          {groups.coin_pack.map((it) =>
            renderItem(
              it,
              CATEGORY_BORDER.coin_pack,
              undefined,
              setDetailItem,
              tokens
            )
          )}
        </Section>
      </ScrollView>

      <ItemDetailModal
        visible={!!detailItem}
        item={detailItem}
        onClose={() => setDetailItem(null)}
      />

      <InsufficientCoinsModal
        visible={showInsufficient}
        needed={need}
        onClose={() => setShowInsufficient(false)}
        onGotoCoins={() => {
          setShowInsufficient(false);
          scrollRef.current?.scrollToEnd({ animated: true });
        }}
      />

      <OrderSuccessModal
        visible={showOrderSuccess}
        title={lastOrderTitle}
        onClose={() => setShowOrderSuccess(false)}
      />

      <AddressSheet
        visible={addressVisible}
        loading={addressSubmitting}
        initialValues={initialAddressValues}
        coinBalance={coinsRef.current ?? coins ?? 0}
        onClose={() => {
          if (addressSubmitting) return;
          setAddressVisible(false);
          setPendingItem(null);
          setPendingSize(null);
        }}
        onSubmit={handleAddressConfirm}
      />

      {floatingCompanion && (
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            position: "absolute",
            left: floatPos.x,
            top: floatPos.y,
            width: FLOAT_SIZE,
            height: FLOAT_SIZE,
            borderRadius: FLOAT_BORDER_RADIUS,
            borderWidth: 2,
            borderColor: NEON_BORDER,
            backgroundColor: FLOAT_BG_COLOR,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
            transform: [
              { translateY: floatHop },
              { translateX: shakeX },
              { scale: floatScale },
              { rotate: floatRotation },
            ],
          }}
        >
          <Pressable
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            onPress={handleFloatingPress}
          >
            {floatingCompanion.image ? (
              <Image
                source={floatingCompanion.image}
                style={{
                  width: "100%",
                  height: "100%",
                  opacity: isWhiteLegendId(
                    floatingCompanion.canonId || floatingCompanion.id
                  )
                    ? 0.9
                    : 1,
                }}
                resizeMode="contain"
              />
            ) : (
              <Text
                style={{
                  color: tokens.text as any,
                  fontSize: 12,
                  fontWeight: "700",
                  textAlign: "center",
                  paddingHorizontal: 4,
                }}
              >
                {floatingCompanion.title}
              </Text>
            )}
            <CompanionEffectOverlay type={activeEffect} effectKey={effectKey} />
          </Pressable>
        </Animated.View>
      )}
    </LinearGradient>
  );
}