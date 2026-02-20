// app/(tabs)/shop.tsx
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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

import { startCheckout } from "../utils/checkout";
import { startCoinCheckout } from "../utils/coinCheckout";
import { notifyCoinOrder } from "../utils/coin-order";

import AddressSheet, { AddressPayload } from "../components/AddressSheet";

/* ----------------------------- Local typings ------------------------------ */
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

// Extended companion effect types
type CompanionEffectType =
  | "hearts"
  | "stars"
  | "stardust"
  | "sparkles"
  | "orbs"
  | "balloons"
  | "moons"
  | null;

// Local orders list (purely client-side for now)
const ORDERS_KEY = "@nova/orders";

const REQUIRES_SHIPPING = new Set<Category>([
  "plushies",
  "clothing",
  "tangibles",
]);

/* ------------------------------- Utilities -------------------------------- */

function canonId(raw: string | null | undefined): string {
  if (!raw) return "";
  let v = String(raw).trim().toLowerCase();

  // normalize separators
  v = v.replace(/-/g, "_");

  if (!v.includes(":")) {
    // cursors
    if (v === "glow" || v === "cursor_glow") {
      v = "cursor:glow";
    } else if (v === "orb" || v === "cursor_orb") {
      v = "cursor:orb";
    } else if (
      v === "startrail" ||
      v === "star_trail" ||
      v === "cursor_startrail" ||
      v === "cursor_star_trail"
    ) {
      v = "cursor:star_trail";
    }
    // themes
    else if (
      [
        "neon",
        "starry",
        "pink",
        "dark",
        "mint",
        "glitter",
        "blackgold",
        "black_gold",
        "crimson",
        "emerald",
        "neonpurple",
        "neon_purple",
        "silver",
        "crimson_dream",
        "emerald_wave",
        "silver_frost",
      ].includes(v)
    ) {
      v = "theme:" + v;
    }
    // generic prefixes
    else if (v.startsWith("cursor")) {
      v = "cursor:" + v.replace(/^cursor[_:]?/, "");
    } else if (v.startsWith("theme")) {
      v = "theme:" + v.replace(/^theme[_:]?/, "");
    }
  }

  // aliases
  if (v === "cursor:startrail") v = "cursor:star_trail";
  if (v === "theme:black_gold") v = "theme:blackgold";
  if (v === "theme:neon_purple") v = "theme:neonpurple";

  // long-name → base
  if (v === "theme:crimson_dream") v = "theme:crimson";
  if (v === "theme:emerald_wave") v = "theme:emerald";
  if (v === "theme:silver_frost") v = "theme:silver";

  return v;
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

/**
 * Build a stable, per-companion effect map so each one
 * gets a distinct animated effect and we don't spam stars.
 */
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

  (COMPANIONS as any[]).forEach((comp) => {
    const text = `${comp?.title ?? ""} ${comp?.desc ?? ""}`.toLowerCase();
    let type: CompanionEffectType = null;

    // Strong keyword matches first
    if (text.includes("balloon")) {
      type = "balloons";
    } else if (text.includes("moon") || text.includes("luna")) {
      type = "moons";
    } else if (text.includes("stardust") || text.includes("star dust")) {
      type = "stardust";
    } else if (text.includes("heart") || text.includes("love")) {
      type = "hearts";
    } else if (
      text.includes("sparkle") ||
      text.includes("sparkly") ||
      text.includes("glitter")
    ) {
      type = "sparkles";
    } else if (text.includes("orb") || text.includes("nova")) {
      type = "orbs";
    }

    // Remaining companions get assigned from the rotating sequence.
    if (!type) {
      type = EFFECT_SEQUENCE[seqIdx % EFFECT_SEQUENCE.length];
      seqIdx += 1;
    }

    map[comp.id] = type;
  });

  return map;
}

const COMPANION_EFFECT_MAP = buildCompanionEffectMap();

function getCompanionEffect(id: string): CompanionEffectType {
  return COMPANION_EFFECT_MAP[id] ?? "stars";
}

/* --------------------------------- UI bits ------------------------------- */

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
}: {
  children: React.ReactNode;
  color: string;
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
      }}
    >
      {children}
    </View>
  );
}

/* ------------------------ Neon Order Success Modal ------------------------ */
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

/* -------------------- Item Detail Modal (zoomed view) --------------------- */

function ItemDetailModal({
  visible,
  item,
  onClose,
}: {
  visible: boolean;
  item: any | null;
  onClose: () => void;
}) {
  const { tokens } = useTheme();
  const [showAlt, setShowAlt] = useState(false);

  useEffect(() => {
    // reset flip when switching items
    setShowAlt(false);
  }, [item?.id]);

  if (!item) return null;

  const hasAlt = !!(item.altImageKey && altImages[item.altImageKey]);
  const imgSrc =
    showAlt && hasAlt
      ? altImages[item.altImageKey]
      : item.image || (hasAlt ? altImages[item.altImageKey] : null);

  const priceCoins = item.priceCoins ?? item.coinPrice ?? null;
  const priceUSD = item.priceUSD ?? null;
  const abilityNote = item.ability?.note ?? null;

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
                  }}
                >
                  <Image
                    source={imgSrc}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="contain"
                  />
                </View>
              ) : null}

              {hasAlt && (
                <Pressable
                  onPress={() => setShowAlt((v) => !v)}
                  style={({ pressed }) => ({
                    alignSelf: "center",
                    marginBottom: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: tokens.border as any,
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
                  }}
                >
                  Ability: {abilityNote}
                </Text>
              ) : null}

              {(priceCoins || priceUSD) && (
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
                        ${priceUSD.toFixed(0)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  marginTop: 8,
                  alignSelf: "center",
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
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

/* --------- Visual overlay for companion click effects (hearts/stars/etc) -- */

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
      useNativeDriver: true,
    }).start();
  }, [type, effectKey, anim]);

  if (!type) return null;

  const icons =
    type === "hearts"
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
      : /* stars */ ["⭐", "🌟", "⭐", "✦", "✧", "⭐"];

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

        return (
          <Animated.Text
            key={`${type}-${index}-${effectKey}`}
            style={{
              position: "absolute",
              bottom: 4,
              fontSize: 26,
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
  const { user: currentUser } = useUser();
  const { purchases, isOwned, grant } = usePurchases();
  const {
    activeCompanionId: equippedCompanionId,
    ownedCompanions: ownedCompanionIds,
    equipCompanion,
  } = useCompanion();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [need, setNeed] = useState<number>(0);
  const [showInsufficient, setShowInsufficient] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [lastOrderTitle, setLastOrderTitle] = useState<string | null>(null);

  const [addressVisible, setAddressVisible] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [pendingItem, setPendingItem] = useState<any | null>(null);
  const [pendingSize, setPendingSize] = useState<string | null>(null);

  // Item detail modal
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

  const clickModeRef = useRef(0);

  const [activeEffect, setActiveEffect] = useState<CompanionEffectType>(null);
  const [effectKey, setEffectKey] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        const newX = floatBasePos.current.x + gesture.dx;
        const newY = floatBasePos.current.y + gesture.dy;
        setFloatPos({ x: newX, y: newY });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onUrl = async (event: { url: string }) => {
      const { queryParams, path } = Linking.parse(event.url);
      const sku = (queryParams?.sku as string) || "";
      track("shop_return_deeplink", { url: event.url, path, sku });
      if (!sku) return;

      const it = catalog.find((x) => x.id === sku);
      if (!it) return;

      const cid = canonId(it.id);

      if (
        it.category === "theme" ||
        it.category === "cursor" ||
        it.category === "bundle"
      ) {
        const grantId = cid || it.id;

        void grant(grantId);

        track("shop_purchase_complete", {
          sku: grantId,
          category: it.category,
          mode: "stripe",
        });

        if (it.category === "theme")
          equipThemeImmediate(grantId, { source: "deeplink" });
        if (it.category === "cursor")
          void equipCursorImmediate(grantId, { source: "deeplink" });
        return;
      }

      if (it.category === "coin_pack") {
        const addAmt = dollarsToCoins(it.priceUSD ?? 0);
        const cur = coinsRef.current ?? coins ?? 0;
        const nextCoins = cur + addAmt;

        coinsRef.current = nextCoins;
        await setCoins(nextCoins);

        track("shop_coins_added", {
          amount: addAmt,
          via: "stripe",
          sku: it.id,
        });
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
  }, [setCoins, coins, grant]);

  function markOwned(id: string) {
    const cid = canonId(id);
    const grantId = cid || id;
    void grant(grantId);
    track("shop_owned_marked", {
      id: grantId,
    });
  }

  function equipThemeImmediate(
    shopThemeId: string,
    meta?: Record<string, any>
  ) {
    const cid = canonId(shopThemeId);
    const mapped = toThemeCtxId(cid) ?? cid;
    if (typeof setThemeById === "function") setThemeById(mapped);
    track("shop_equip", {
      kind: "theme",
      id: cid,
      mapped,
      ...meta,
    });
  }

  function unequipThemeImmediate(meta?: Record<string, any>) {
    const prev = themeId;
    if (typeof setThemeById === "function") setThemeById("theme:neon");
    track("shop_unequip", {
      kind: "theme",
      id: prev,
      ...meta,
    });
  }

  async function equipCursorImmediate(
    shopId: string,
    meta?: Record<string, any>
  ) {
    const cid = canonId(shopId);
    if (typeof setCursorById === "function") {
      await setCursorById(cid);
    }
    track("shop_equip", {
      kind: "cursor",
      id: cid,
      mapped: cid,
      ...meta,
    });
  }

  async function unequipCursorImmediate(meta?: Record<string, any>) {
    const prev = cursorId;
    if (typeof setCursorById === "function") {
      await setCursorById(null);
    }
    track("shop_unequip", {
      kind: "cursor",
      id: prev,
      ...meta,
    });
  }

  const THEMES_MENU: QuickItem[] = useMemo(() => {
    const eq = canonId(themeId ?? "");
    return [
      {
        id: "theme:neon",
        name: "Neon Nova",
        kind: "theme",
        owned: isOwned("theme:neon"),
        equipped: eq === canonId("theme:neon"),
      },
      {
        id: "theme:starry",
        name: "Starry Night",
        kind: "theme",
        owned: isOwned("theme:starry"),
        equipped: eq === canonId("theme:starry"),
      },
      {
        id: "theme:pink",
        name: "Pink Dawn",
        kind: "theme",
        owned: isOwned("theme:pink"),
        equipped: eq === canonId("theme:pink"),
      },
      {
        id: "theme:dark",
        name: "Dark Nova",
        kind: "theme",
        owned: isOwned("theme:dark"),
        equipped: eq === canonId("theme:dark"),
      },
      {
        id: "theme:mint",
        name: "Mint Breeze",
        kind: "theme",
        owned: isOwned("theme:mint"),
        equipped: eq === canonId("theme:mint"),
      },
      {
        id: "theme:glitter",
        name: "Glitter",
        kind: "theme",
        owned: isOwned("theme:glitter"),
        equipped: eq === canonId("theme:glitter"),
      },
      {
        id: "theme:blackgold",
        name: "Black & Gold",
        kind: "theme",
        owned: isOwned("theme:blackgold"),
        equipped: eq === canonId("theme:blackgold"),
      },
      {
        id: "theme:crimson",
        name: "Crimson Dream",
        kind: "theme",
        owned: isOwned("theme:crimson"),
        equipped: eq === canonId("theme:crimson"),
      },
      {
        id: "theme:emerald",
        name: "Emerald Wave",
        kind: "theme",
        owned: isOwned("theme:emerald"),
        equipped: eq === canonId("theme:emerald"),
      },
      {
        id: "theme:neonpurple",
        name: "Neon Purple",
        kind: "theme",
        owned: isOwned("theme:neonpurple"),
        equipped: eq === canonId("theme:neonpurple"),
      },
      {
        id: "theme:silver",
        name: "Silver Frost",
        kind: "theme",
        owned: isOwned("theme:silver"),
        equipped: eq === canonId("theme:silver"),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchases, themeId]);

  const CURSORS_MENU: QuickItem[] = useMemo(() => {
    const eq = canonId(cursorId ?? "");
    return [
      {
        id: "cursor:glow",
        name: "Glow Cursor",
        kind: "cursor",
        owned: isOwned("cursor:glow"),
        equipped: eq === canonId("cursor:glow"),
      },
      {
        id: "cursor:orb",
        name: "Orb Glow",
        kind: "cursor",
        owned: isOwned("cursor:orb"),
        equipped: eq === canonId("cursor:orb"),
      },
      {
        id: "cursor:star_trail",
        name: "Star Trail",
        kind: "cursor",
        owned: isOwned("cursor:star_trail"),
        equipped: eq === canonId("cursor:star_trail"),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchases, cursorId]);

  // My Companions strip uses both CompanionContext + PurchasesContext
  const ownedCompanions = useMemo(
    () =>
      COMPANIONS.filter((c: any) => {
        const cid = c.canonId || canonId(c.id);
        const fromContext = (ownedCompanionIds || []).some(
          (ownedId: string) =>
            ownedId === cid ||
            ownedId === c.id ||
            ownedId === canonId(c.id)
        );
        const fromPurchases =
          isOwned(c.id) || isOwned(cid) || isOwned(canonId(c.id));
        return fromContext || fromPurchases;
      }),
    [ownedCompanionIds, purchases]
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
    const kindGuess: "theme" | "cursor" | "other" = id.startsWith("theme:")
      ? "theme"
      : id.startsWith("cursor:")
      ? "cursor"
      : "other";

    const cid = canonId(id);

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
    track("shop_modal_insufficient_shown", {
      needed: 1000,
      via: "quick_row",
    });
    setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      50
    );
  }

  const groups = useMemo(() => {
    const byCat: Record<Category, typeof catalog> = {
      plushies: [],
      clothing: [],
      tangibles: [],
      cursor: [],
      theme: [],
      bundle: [],
      coin_pack: [],
    };

    for (const it of catalog) {
      if (it.category === "bundle") {
        const idLc = (it.id ?? "").toLowerCase();
        const titleLc =
          typeof it.title === "string" ? it.title.toLowerCase() : "";
        if (idLc.includes("neon") || titleLc.includes("neon")) {
          continue;
        }
      }
      byCat[it.category].push(it);
    }
    return byCat;
  }, []);

  function buyWithCoins(it: any, meta?: { size?: string }) {
    const price = it.priceCoins ?? 0;
    if (!price) return;

    if (REQUIRES_SHIPPING.has(it.category)) {
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

      setPendingItem({
        ...it,
        priceCoins: price,
      });
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

    const cid = canonId(it.id);
    const grantId = cid || it.id;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void setCoins(nextCoins);

    void grant(grantId);

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
    if (it.category === "companions") {
      void equipCompanion(grantId).catch(() => {});
    }
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

      markOwned(it.id);

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

      const phone =
        a.phone ||
        a.contactPhone ||
        a.phoneNumber ||
        "";

      const address1 =
        a.address1 ||
        a.line1 ||
        a.addressLine1 ||
        "";

      const address2 =
        a.address2 ||
        a.line2 ||
        a.addressLine2 ||
        "";

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

  // ✅ NEW: call startCheckout with a proper amount in dollars
  async function moneyBuy(it: any, meta?: { size?: string }) {
    try {
      const amount =
        typeof it.priceUSD === "number" && isFinite(it.priceUSD)
          ? it.priceUSD
          : undefined;

      track("shop_money_buy_click", {
        sku: it.id,
        category: it.category,
        amount,
      });

      await startCheckout({
        sku: it.id,
        productId: it.stripeProductId || it.productId || undefined,
        priceId: it.stripePriceId || it.priceId || undefined,
        amount, // dollars — checkout.ts will convert to cents
        currency: "usd",
        quantity: 1,
        meta: {
          size: meta?.size || null,
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
    if (!isOwned(it.id)) return;
    equipThemeImmediate(it.id, { source: "card_equip" });
  }

  async function equipCursor(it: any) {
    if (!isOwned(it.id)) return;
    await equipCursorImmediate(it.id, { source: "card_equip" });
  }

  /* ------------------------- Companion trigger logic ---------------------- */

  function wiggleAction() {
    floatScale.setValue(1);
    Animated.sequence([
      Animated.timing(floatScale, {
        toValue: 1.18,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(floatScale, {
        toValue: 0.95,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(floatScale, {
        toValue: 1.05,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(floatScale, {
        toValue: 1,
        duration: 110,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function hopAction() {
    floatHop.setValue(0);
    Animated.sequence([
      Animated.timing(floatHop, {
        toValue: -14,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(floatHop, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function spinAction() {
    floatRotate.setValue(0);
    Animated.sequence([
      Animated.timing(floatRotate, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(floatRotate, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function shimmyAction() {
    floatShake.setValue(0);
    Animated.sequence([
      Animated.timing(floatShake, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(floatShake, {
        toValue: -1,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(floatShake, {
        toValue: 0.5,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(floatShake, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function swirlAction() {
    floatScale.setValue(1);
    floatRotate.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(floatScale, {
          toValue: 1.2,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(floatScale, {
          toValue: 0.95,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(floatScale, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(floatRotate, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(floatRotate, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
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

    if (activeEffect) {
      setEffectKey((k) => k + 1);
    }
  }

  function triggerCompanion(id: string) {
    const comp = COMPANIONS.find((c: any) => c.id === id);
    if (comp) {
      setFloatingCompanion(comp);
      setActiveEffect(getCompanionEffect(id));

      const dims = Dimensions.get("window");
      const startX = dims.width - FLOAT_SIZE - 16;
      const startY = dims.height - FLOAT_SIZE - 160;

      floatBasePos.current = { x: startX, y: startY };
      setFloatPos({ x: startX, y: startY });

      wiggleAction();
    }

    setStripActiveId(id);
    companionAnim.setValue(0);
    track("companion_triggered", { id });

    equipCompanion(id).catch(() => {});

    Animated.sequence([
      Animated.timing(companionAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(companionAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStripActiveId(null);
    });
  }

  /* ----------------------------- Render helpers --------------------------- */

  const renderItem = (
    it: any,
    color: string,
    equipable?: "theme" | "cursor",
    onOpenDetail?: (item: any) => void
  ) => {
    const owned = isOwned(it.id);

    const src =
      it.image ||
      (it.altImageKey && altImages[it.altImageKey]) ||
      null;

    const sizeKey =
      it.stripeProductId ||
      it.productId ||
      (it.stripe && it.stripe.productId) ||
      it.id;

    let sizes = getSizesFor(sizeKey);
    if (!sizes.length && it.category === "clothing")
      sizes = ["S", "M", "L", "XL"];
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

    return (
      <Card key={it.id} color={color}>
        {src ? (
          <Pressable
            onPress={() => {
              if (onOpenDetail) onOpenDetail(it);
            }}
            onLongPress={() => {
              if (onOpenDetail) onOpenDetail(it);
            }}
            delayLongPress={180}
            style={{
              width: "100%",
              height: 110,
              borderRadius: 10,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: color,
              marginBottom: 8,
              backgroundColor: tokens.isDark
                ? "rgba(255,255,255,0.02)"
                : "rgba(255,255,255,0.55)",
            }}
          >
            <Image
              source={src}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          </Pressable>
        ) : null}

        <Text
          style={{
            color: tokens.text as any,
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
              color: tokens.text as any,
              fontSize: 12,
              lineHeight: 16,
              textAlign: "center",
              marginTop: 16,
              paddingHorizontal: 8,
            }}
            numberOfLines={3}
          >
            {it.desc}
          </Text>
        ) : null}

        {sizes.length > 0 ? (
          <View style={{ marginTop: 10 }}>
            <Text
              style={{
                color: tokens.text as any,
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
                track("shop_size_change", {
                  sku: it.id,
                  sizeKey,
                  size: s,
                });

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
                borderColor: tokens.border as any,
                backgroundColor: pressed
                  ? tokens.isDark
                    ? "rgba(92,252,200,0.15)"
                    : "rgba(62,211,162,0.15)"
                  : tokens.isDark
                  ? "rgba(92,252,200,0.08)"
                  : "rgba(62,211,162,0.08)",
              })}
            >
              <Text style={{ color: tokens.text as any, fontWeight: "800" }}>
                {equipped ? "Equipped ✓" : "Equip"}
              </Text>
            </Pressable>
          ) : (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                columnGap: 8,
              }}
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
                  borderColor: color,
                  backgroundColor: "transparent",
                  opacity: pressed ? 0.9 : 1,
                  borderWidth: 1,
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
                borderColor: tokens.border as any,
                backgroundColor: pressed
                  ? tokens.isDark
                    ? "rgba(92,252,200,0.15)"
                    : "rgba(62,211,162,0.15)"
                  : tokens.isDark
                  ? "rgba(92,252,200,0.08)"
                  : "rgba(62,211,162,0.08)",
              })}
            >
              <Text style={{ color: tokens.text as any, fontWeight: "800" }}>
                {equipped ? "Equipped ✓" : "Equip"}
              </Text>
            </Pressable>
          ) : (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                columnGap: 8,
              }}
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
        ) : it.category === "coin_pack" ? (
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
        ) : (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              columnGap: 8,
            }}
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

  /* ---------------------------------- UI --------------------------------- */
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
          paddingBottom: 16,
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

        {/* Owned companions quick strip */}
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
                const isActive = stripActiveId === it.id;
                const scale = isActive ? companionScale : 1;

                return (
                  <Animated.View
                    key={it.id}
                    style={{
                      transform: [{ scale }],
                      marginRight: 12,
                    }}
                  >
                    <Pressable
                      onPress={() => triggerCompanion(it.id)}
                      style={({ pressed }) => ({
                        width: 72,
                        height: 72,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: CATEGORY_BORDER.tangibles,
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: pressed
                          ? "rgba(96,165,250,0.24)"
                          : tokens.isDark
                          ? "rgba(15,23,42,0.9)"
                          : "rgba(255,255,255,0.9)",
                      })}
                    >
                      {it.image ? (
                        <Image
                          source={it.image}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text
                          style={{
                            color: tokens.text as any,
                            fontSize: 11,
                            fontWeight: "700",
                            textAlign: "center",
                            paddingHorizontal: 4,
                          }}
                          numberOfLines={2}
                        >
                          {it.title}
                        </Text>
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
            renderItem(it, CATEGORY_BORDER.plushies, undefined, setDetailItem)
          )}
        </Section>

        <Section title="Clothing">
          {groups.clothing.map((it) =>
            renderItem(it, CATEGORY_BORDER.clothing, undefined, setDetailItem)
          )}
        </Section>

        <Section title="Tangibles">
          {groups.tangibles.map((it) =>
            renderItem(it, CATEGORY_BORDER.tangibles, undefined, setDetailItem)
          )}
        </Section>

        {/* Companions */}
        <Section title="Companions">
          {COMPANIONS.map((it: any) => {
            const owned =
              isOwned(it.id) ||
              isOwned(it.canonId) ||
              (ownedCompanionIds || []).some(
                (ownedId: string) =>
                  ownedId === it.canonId ||
                  ownedId === it.id ||
                  ownedId === canonId(it.id)
              );
            const src = it.image;
            const priceCoins = it.coinPrice ?? 25000;

            return (
              <Card key={it.id} color={CATEGORY_BORDER.tangibles}>
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
                      borderWidth: 1,
                      borderColor: CATEGORY_BORDER.tangibles,
                      marginBottom: 8,
                    }}
                  >
                    <Image
                      source={src}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="contain"
                    />
                  </Pressable>
                ) : null}

                <Text
                  style={{
                    color: tokens.text as any,
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
                      color: tokens.text as any,
                      fontSize: 12,
                      lineHeight: 16,
                      textAlign: "center",
                      marginTop: 16,
                      paddingHorizontal: 8,
                    }}
                    numberOfLines={3}
                  >
                    {it.desc}
                  </Text>
                ) : null}

                <View style={{ height: 8 }} />

                {owned ? (
                  <Pressable
                    onPress={() => triggerCompanion(it.id)}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: tokens.border as any,
                      backgroundColor: pressed
                        ? "rgba(96,165,250,0.18)"
                        : tokens.isDark
                        ? "rgba(148,163,184,0.16)"
                        : "rgba(148,163,184,0.12)",
                    })}
                  >
                    <Text
                      style={{
                        color: tokens.text as any,
                        fontWeight: "800",
                      }}
                    >
                      Summon ✓
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() =>
                      buyWithCoins({ ...it, priceCoins, category: "companions" })
                    }
                    style={({ pressed }) => ({
                      alignItems: "center",
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: CATEGORY_BORDER.tangibles,
                      backgroundColor: pressed
                        ? "rgba(96,165,250,0.15)"
                        : "rgba(96,165,250,0.08)",
                    })}
                  >
                    <Text
                      style={{
                        color: CATEGORY_BORDER.tangibles,
                        fontWeight: "800",
                      }}
                    >
                      {priceCoins.toLocaleString()} coins
                    </Text>
                  </Pressable>
                )}
              </Card>
            );
          })}
        </Section>

        <View
          onLayout={(e) =>
            (cursorSectionY.current = e.nativeEvent.layout.y)
          }
        />
        <Section title="Cursors" pulseAnim={cursorPulse}>
          {groups.cursor.map((it) =>
            renderItem(it, CATEGORY_BORDER.cursor, "cursor", setDetailItem)
          )}
        </Section>

        <View
          onLayout={(e) =>
            (themeSectionY.current = e.nativeEvent.layout.y)
          }
        />
        <Section title="Themes" pulseAnim={themePulse}>
          {groups.theme.map((it) =>
            renderItem(it, CATEGORY_BORDER.theme, "theme", setDetailItem)
          )}
        </Section>

        {groups.bundle.length > 0 && (
          <Section title="Bundles">
            {groups.bundle.map((it) =>
              renderItem(it, CATEGORY_BORDER.bundle, undefined, setDetailItem)
            )}
          </Section>
        )}

        <Section title="Coin Packs">
          {groups.coin_pack.map((it) =>
            renderItem(it, CATEGORY_BORDER.coin_pack, undefined, setDetailItem)
          )}
        </Section>

        {orders.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                color: tokens.titleText as any,
                fontSize: 16,
                fontWeight: "800",
                marginBottom: 10,
              }}
            >
              Orders
            </Text>

            {orders.map((o) => (
              <View
                key={o.id}
                style={{
                  borderWidth: 1,
                  borderColor: tokens.border as any,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                  backgroundColor: tokens.isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(255,255,255,0.60)",
                }}
              >
                <Text
                  style={{
                    color: tokens.text as any,
                    fontWeight: "700",
                  }}
                >
                  {o.title}
                </Text>
                <Text
                  style={{
                    color: tokens.text as any,
                    fontSize: 12,
                    marginTop: 16,
                  }}
                >
                  {new Date(o.createdAt).toLocaleString()} ·{" "}
                  {o.status.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <AddressSheet
        visible={addressVisible}
        onClose={() => {
          if (addressSubmitting) return;
          setAddressVisible(false);
          setPendingItem(null);
          setPendingSize(null);
        }}
        onConfirm={handleAddressConfirm}
        submitting={addressSubmitting}
        primaryLabel={pendingItem ? "Place order" : "Place order"}
        initialValues={initialAddressValues}
      />

      {/* Floating companion */}
      {floatingCompanion && (
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            position: "absolute",
            left: floatPos.x,
            top: floatPos.y,
            width: FLOAT_SIZE,
            height: FLOAT_SIZE,
            transform: [
              { scale: floatScale },
              { translateY: floatHop },
              {
                translateX: floatShake.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-5, 0, 5],
                }),
              },
              { rotate: floatRotation },
            ],
            borderRadius: 24,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: CATEGORY_BORDER.tangibles,
            backgroundColor: tokens.isDark
              ? "rgba(15,23,42,0.95)"
              : "rgba(255,255,255,0.95)",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Pressable
            onPress={handleFloatingPress}
            style={{ flex: 1, width: "100%", height: "100%" }}
          >
            {floatingCompanion.image ? (
              <Image
                source={floatingCompanion.image}
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
                  {floatingCompanion.title}
                </Text>
              </View>
            )}
          </Pressable>

          <CompanionEffectOverlay type={activeEffect} effectKey={effectKey} />
        </Animated.View>
      )}

      <InsufficientCoinsModal
        visible={showInsufficient}
        needed={need}
        onClose={() => {
          setShowInsufficient(false);
          track("shop_modal_insufficient_closed");
        }}
        onBuyCoins={() => {
          setShowInsufficient(false);
          track("shop_modal_insufficient_buy_coins");
          setTimeout(
            () => scrollRef.current?.scrollToEnd({ animated: true }),
            50
          );
        }}
      />

      <OrderSuccessModal
        visible={showOrderSuccess}
        title={lastOrderTitle}
        onClose={() => {
          setShowOrderSuccess(false);
          try {
            router.replace("/(tabs)/shop");
          } catch {}
          requestAnimationFrame(() =>
            scrollRef.current?.scrollTo({ y: 0, animated: true })
          );
        }}
      />

      {/* Zoomed item detail modal */}
      <ItemDetailModal
        visible={!!detailItem}
        item={detailItem}
        onClose={() => setDetailItem(null)}
      />
    </LinearGradient>
  );
}