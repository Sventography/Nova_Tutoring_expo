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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { Linking as RNLinking } from "react-native";

import { useCoins } from "../context/CoinsContext";
import { useTheme } from "../context/ThemeContext";
import { useCursor } from "../context/CursorContext";
import { useUser } from "../context/UserContext";

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

/* ----------------------------- Local typings ------------------------------ */
type QuickItem = {
  id: string;
  name: string;
  kind: "theme" | "cursor";
  owned: boolean;
  equipped: boolean;
};
type PurchaseMap = Record<string, true>;
type Order = {
  id: string;
  sku: string;
  title: string;
  status: "paid" | "fulfilled" | "shipped";
  createdAt: number;
};

const COINS_KEY = "coins.balance.v2";

// 🔐 New versioned purchases key, plus backward-compat with legacy
const PURCHASES_KEY = "@nova/purchases.v2";
const PURCHASES_COMPAT_KEYS = ["@nova/purchases", PURCHASES_KEY];

const CURSOR_KEY = "@nova/cursor";
const THEME_KEY = "@nova/themeId";
const ORDERS_KEY = "@nova/orders";

const REQUIRES_SHIPPING = new Set<Category>([
  "plushies",
  "clothing",
  "tangibles",
]);

/* ------------------------------- Utilities -------------------------------- */

// Canonical ID for themes & cursors so everything agrees (shop, context, overlay)
function canonId(raw: string | null | undefined): string {
  if (!raw) return "";
  let v = String(raw).trim().toLowerCase();

  // normalize separators
  v = v.replace(/-/g, "_");

  if (!v.includes(":")) {
    // known cursors (handles old saves like "glow", "cursor_glow", etc.)
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
    // known themes (base names and long variants)
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
        // long-name variants
        "crimson_dream",
        "emerald_wave",
        "silver_frost",
      ].includes(v)
    ) {
      v = "theme:" + v;
    }
    // generic "cursorX" / "themeX" strings
    else if (v.startsWith("cursor")) {
      v = "cursor:" + v.replace(/^cursor[_:]?/, "");
    } else if (v.startsWith("theme")) {
      v = "theme:" + v.replace(/^theme[_:]?/, "");
    }
  }

  // cursor aliases
  if (v === "cursor:startrail") v = "cursor:star_trail";

  // theme aliases (underscore/hyphen versions & long names)
  if (v === "theme:black_gold") v = "theme:blackgold";
  if (v === "theme:neon_purple") v = "theme:neonpurple";

  // long-name → base ids
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

// normalize all saved purchase keys into canonical IDs
function normalizePurchases(obj: Record<string, any>): PurchaseMap {
  const out: Record<string, true> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (!v) continue;
    const cid = canonId(k);
    if (cid) out[cid] = true;
  }
  return out;
}

const track = (event: string, props?: Record<string, any>) => {
  try {
    (globalThis as any).novaTrack?.(event, props ?? {});
  } catch {}
};

async function loadCoins(): Promise<number> {
  const v = await AsyncStorage.getItem(COINS_KEY);
  return v ? parseInt(v, 10) : 0;
}
async function saveCoins(n: number) {
  await AsyncStorage.setItem(COINS_KEY, String(n));
}

// 🔁 Read from both legacy & v2 keys, merge, normalize, and write back to v2
async function loadPurchases(): Promise<PurchaseMap> {
  let merged: Record<string, any> = {};
  for (const key of PURCHASES_COMPAT_KEYS) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        merged = { ...merged, ...parsed };
      }
    } catch {
      // ignore broken entries; we'll normalize below
    }
  }
  const norm = normalizePurchases(merged);
  // Ensure v2 (and legacy) are kept in sync with normalized map
  await savePurchases(norm);
  return norm;
}

async function savePurchases(m: PurchaseMap) {
  const norm = normalizePurchases(m);
  const serialized = JSON.stringify(norm);
  await Promise.all(
    PURCHASES_COMPAT_KEYS.map((key) => AsyncStorage.setItem(key, serialized))
  );
}

async function loadCursor(): Promise<string | null> {
  return (await AsyncStorage.getItem(CURSOR_KEY)) || null;
}
async function saveCursor(key: string | null) {
  key
    ? await AsyncStorage.setItem(CURSOR_KEY, key)
    : await AsyncStorage.removeItem(CURSOR_KEY);
}
async function loadTheme(): Promise<string | null> {
  return (await AsyncStorage.getItem(THEME_KEY)) || null;
}
async function saveTheme(id: string | null) {
  id
    ? await AsyncStorage.setItem(THEME_KEY, id)
    : await AsyncStorage.removeItem(THEME_KEY);
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

/* ----------------- Stripe wrapper for $$ buttons -------------------------- */
async function startCheckoutRequest(opts: {
  priceId?: string;
  amount?: number;
  currency?: string;
  success_url?: string;
  cancel_url?: string;
  quantity?: number;
  meta?: any;
}) {
  const origin =
    (typeof window !== "undefined" && (window as any).location?.origin) ||
    "http://localhost:8081";

  const payload: any = {
    quantity: opts?.quantity ?? 1,
    success_url: opts?.success_url || `${origin}/?purchase=success`,
    cancel_url: opts?.cancel_url || `${origin}/?purchase=cancel`,
    meta: opts?.meta,
  };

  if (typeof opts?.amount === "number") {
    payload.amount = opts.amount;
    payload.currency = (opts.currency || "usd").toLowerCase();
  }
  if (opts?.priceId) payload.priceId = opts.priceId;

  return startCheckout(payload);
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

/* --------------------------------- Screen -------------------------------- */
export default function Shop() {
  // ✅ Hooks all at top level, no try/catch, no conditionals
  const { coins, setCoins } = useCoins();
  const { tokens, setThemeById } = useTheme();
  const { setCursorById } = useCursor();
  const { user: currentUser } = useUser();
  const router = useRouter();

  const [purchases, setPurchases] = useState<PurchaseMap>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [equippedCursor, setEquippedCursor] = useState<string | null>(null);
  const [equippedTheme, setEquippedTheme] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [need, setNeed] = useState<number>(0);
  const [showInsufficient, setShowInsufficient] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [lastOrderTitle, setLastOrderTitle] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const sizeCtl = useSelectedSizes();

  const themeSectionY = useRef<number>(0);
  const cursorSectionY = useRef<number>(0);

  const themePulse = useRef(new Animated.Value(0)).current;
  const cursorPulse = useRef(new Animated.Value(0)).current;

  const coinsRef = useRef<number>(coins ?? 0);

  // 🔥 DEV CHEAT: tap Shop title 5x → +500,000 coins (dev only)
  const [devTapCount, setDevTapCount] = useState(0);

  // companions strip bounce state
  const [activeCompanionId, setActiveCompanionId] = useState<string | null>(
    null
  );
  const companionAnim = useRef(new Animated.Value(0)).current;
  const companionScale = companionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  // floating companion (bottom-right, draggable, with multiple tap actions)
  const [floatingCompanion, setFloatingCompanion] = useState<any | null>(null);
  const windowDims = Dimensions.get("window");
  const FLOAT_SIZE = 80;

  const floatBasePos = useRef({
    x: windowDims.width - FLOAT_SIZE - 16,
    y: windowDims.height - FLOAT_SIZE - 160,
  });
  const floatPos = useRef(
    new Animated.ValueXY({
      x: floatBasePos.current.x,
      y: floatBasePos.current.y,
    })
  ).current;

  const floatScale = useRef(new Animated.Value(1)).current;
  const floatHop = useRef(new Animated.Value(0)).current;
  const floatShake = useRef(new Animated.Value(0)).current;
  const floatRotate = useRef(new Animated.Value(0)).current;

  const floatRotation = floatRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const clickModeRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        const newX = floatBasePos.current.x + gesture.dx;
        const newY = floatBasePos.current.y + gesture.dy;
        floatPos.setValue({ x: newX, y: newY });
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
        floatPos.setValue({ x: newX, y: newY });
      },
    })
  ).current;

  useEffect(() => {
    coinsRef.current = coins ?? 0;
  }, [coins]);

  const isOwned = (id: string) => {
    const cid = canonId(id);
    return !!purchases[cid];
  };

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

  // 🔥 Dev cheat handler: 5 taps on title → +500k coins (dev only)
  const handleDevTitlePress = () => {
    if (!__DEV__) return;

    setDevTapCount((prev) => {
      const next = prev + 1;

      if (next % 5 === 0) {
        const bonus = 500_000;
        const cur = coinsRef.current ?? 0;
        const nextCoins = cur + bonus;

        setCoins(nextCoins);
        coinsRef.current = nextCoins;
        void saveCoins(nextCoins);

        track("dev_shop_title_cheat", {
          bonus,
          taps: next,
        });

        try {
          console.log(
            `[DEV CHEAT] Granted ${
              bonus.toLocaleString?.() ?? bonus
            } coins from Shop title taps`
          );
        } catch {
          console.log("[DEV CHEAT] Granted 500,000 coins from Shop title taps");
        }
      }

      return next;
    });
  };

  /* --------------------------- Initial data load -------------------------- */
  useEffect(() => {
    (async () => {
      const [c, pRaw, curRaw, thRaw, ord] = await Promise.all([
        loadCoins(),
        loadPurchases(),
        loadCursor(),
        loadTheme(),
        loadOrders(),
      ]);

      const p = normalizePurchases(pRaw);
      if (JSON.stringify(p) !== JSON.stringify(pRaw)) {
        await savePurchases(p);
      }

      setCoins(c);
      setPurchases(p);

      const cur = canonId(curRaw);
      const th = canonId(thRaw);

      setEquippedCursor(cur || null);
      setEquippedTheme(th || null);
      setOrders(ord);

      if (typeof setCursorById === "function") setCursorById(cur || null);

      const mappedTheme = toThemeCtxId(th);
      if (typeof setThemeById === "function") setThemeById(mappedTheme);

      track("shop_state_hydrated", {
        coins: c,
        purchases_count: Object.keys(p).length,
        cursor: cur,
        theme: th,
        orders: ord.length,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof setCursorById === "function")
      setCursorById(equippedCursor ? canonId(equippedCursor) : null);
  }, [equippedCursor, setCursorById]);

  useEffect(() => {
    const mapped = toThemeCtxId(equippedTheme);
    if (typeof setThemeById === "function") setThemeById(mapped);
  }, [equippedTheme, setThemeById]);

  /* --------------------------- Deep link handling ------------------------- */
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
        setPurchases((prev) => {
          const next: PurchaseMap = { ...prev };
          if (cid) next[cid] = true;
          void savePurchases(next);
          track("shop_purchase_complete", {
            sku: cid || it.id,
            category: it.category,
            mode: "stripe",
          });
          return next;
        });

        if (it.category === "theme")
          equipThemeImmediate(cid || it.id, { source: "deeplink" });
        if (it.category === "cursor")
          void equipCursorImmediate(cid || it.id, { source: "deeplink" });
        return;
      }

      if (it.category === "coin_pack") {
        const addAmt = dollarsToCoins(it.priceUSD ?? 0);
        const nextCoins = (coinsRef.current ?? 0) + addAmt;
        setCoins(nextCoins);
        await saveCoins(nextCoins);
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
  }, [setCoins]);

  /* -------------------------- Equip helpers ------------------------------- */

  function markOwned(id: string) {
    const cid = canonId(id);
    setPurchases((prev) => {
      const next: PurchaseMap = { ...prev };
      if (cid) next[cid] = true;
      void savePurchases(next);
      track("shop_owned_marked", {
        id: cid || id,
        owned_count: Object.keys(next).length,
      });
      return next;
    });
  }

  function equipThemeImmediate(
    shopThemeId: string,
    meta?: Record<string, any>
  ) {
    const cid = canonId(shopThemeId);
    const mapped = toThemeCtxId(cid);
    setEquippedTheme(cid);
    void saveTheme(cid);
    if (typeof setThemeById === "function") setThemeById(mapped);
    track("shop_equip", {
      kind: "theme",
      id: cid,
      mapped,
      ...meta,
    });
  }

  function unequipThemeImmediate(meta?: Record<string, any>) {
    const prev = equippedTheme;
    setEquippedTheme(null);
    void saveTheme(null);
    if (typeof setThemeById === "function") setThemeById(null);
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
    setEquippedCursor(cid);
    await saveCursor(cid);
    if (typeof setCursorById === "function") setCursorById(cid);
    track("shop_equip", {
      kind: "cursor",
      id: cid,
      mapped: cid,
      ...meta,
    });
  }

  async function unequipCursorImmediate(meta?: Record<string, any>) {
    const prev = equippedCursor;
    setEquippedCursor(null);
    await saveCursor(null);
    if (typeof setCursorById === "function") setCursorById(null);
    track("shop_unequip", {
      kind: "cursor",
      id: prev,
      ...meta,
    });
  }

  /* ----------------------------- Quick menus ------------------------------ */
  const THEMES_MENU: QuickItem[] = useMemo(() => {
    const eq = canonId(equippedTheme ?? "");
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
  }, [purchases, equippedTheme]);

  const CURSORS_MENU: QuickItem[] = useMemo(() => {
    const eq = canonId(equippedCursor ?? "");
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
  }, [purchases, equippedCursor]);

  const ownedCompanions = useMemo(
    () => COMPANIONS.filter((c: any) => isOwned(c.id)),
    [purchases]
  );

  function quickEquip(id: string, kind: "theme" | "cursor") {
    const cid = canonId(id);
    const isCurrentlyEq =
      kind === "theme"
        ? canonId(equippedTheme ?? "") === cid
        : canonId(equippedCursor ?? "") === cid;

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
      const amount = Math.round((it.priceUSD ?? 1) * 100);
      const success = Linking.createURL("/", { queryParams: { sku: it.id } });
      void startCheckoutRequest({
        amount,
        currency: "usd",
        success_url: success,
        cancel_url: success,
      });
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

  /* ----------------------------- Group catalog ---------------------------- */
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
    for (const it of catalog) byCat[it.category].push(it);
    return byCat;
  }, []);

  /* ---------------------------- Purchase flows ---------------------------- */

  function buyWithCoins(it: any, meta?: { size?: string }) {
    const price = it.priceCoins ?? 0;
    if (!price) return;

    if (REQUIRES_SHIPPING.has(it.category)) {
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
      });

      const userForOrder =
        currentUser &&
        (currentUser.contactEmail ||
          currentUser.email ||
          currentUser.username)
          ? {
              id: currentUser.id,
              username:
                currentUser.username ?? currentUser.name ?? undefined,
              displayName:
                currentUser.displayName ??
                currentUser.name ??
                currentUser.username ??
                undefined,
              contactEmail:
                currentUser.contactEmail ??
                currentUser.email ??
                null,
              email:
                currentUser.contactEmail ??
                currentUser.email ??
                null,
            }
          : undefined;

      startCoinCheckout({
        id: it.id,
        title: it.title,
        priceCoins: price,
        imageUrl: undefined,
        category: it.category,
        size: chosen,
        user: userForOrder,
      });
      return;
    }

    const curCoins = coinsRef.current ?? 0;
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
    const cid = canonId(it.id);
    const nextPurch: PurchaseMap = { ...purchases };
    if (cid) nextPurch[cid] = true;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCoins(nextCoins);
    void saveCoins(nextCoins);

    setPurchases(nextPurch);
    void savePurchases(nextPurch);

    track("shop_purchase_complete", {
      sku: cid || it.id,
      category: it.category,
      mode: "coins",
      price,
    });

    if (it.category === "theme")
      equipThemeImmediate(cid || it.id, { source: "coins_purchase" });
    if (it.category === "cursor")
      void equipCursorImmediate(cid || it.id, { source: "coins_purchase" });
  }

  async function moneyBuy(it: any, meta?: { size?: string }) {
    const amount = Math.round((it.priceUSD ?? 1) * 100);
    const success = Linking.createURL("/", {
      queryParams: { sku: it.id, size: meta?.size || "" },
    });

    track("shop_money_buy", {
      sku: it.id,
      amount_cents: amount,
      meta,
    });

    await startCheckoutRequest({
      amount,
      currency: "usd",
      success_url: success,
      cancel_url: success,
    });

    if (
      it.category === "theme" ||
      it.category === "cursor" ||
      it.category === "bundle"
    )
      markOwned(it.id);
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

  function handleFloatingPress() {
    clickModeRef.current = (clickModeRef.current + 1) % 4;
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
      default:
        wiggleAction();
    }
  }

  function triggerCompanion(id: string) {
    const comp = COMPANIONS.find((c: any) => c.id === id);
    if (comp) {
      setFloatingCompanion(comp);

      // reset starting position bottom-right, but above tab bar
      const dims = Dimensions.get("window");
      const startX = dims.width - FLOAT_SIZE - 16;
      const startY = dims.height - FLOAT_SIZE - 160;

      floatBasePos.current = { x: startX, y: startY };
      floatPos.setValue({ x: startX, y: startY });

      wiggleAction();
    }

    setActiveCompanionId(id);
    companionAnim.setValue(0);
    track("companion_triggered", { id });

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
      setActiveCompanionId(null);
    });
  }

  /* ----------------------------- Render helpers --------------------------- */

  const renderItem = (
    it: any,
    color: string,
    equipable?: "theme" | "cursor"
  ) => {
    const owned = isOwned(it.id);

    const showAlt =
      flipped[it.id] && it.altImageKey && altImages[it.altImageKey];
    const src = showAlt ? altImages[it.altImageKey!] : it.image;

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
    const equipped =
      equipable === "theme"
        ? canonId(equippedTheme ?? "") === cid
        : equipable === "cursor"
        ? canonId(equippedCursor ?? "") === cid
        : false;

    // 🧠 IMPORTANT: no hooks here – we just use `tokens` from closure
    return (
      <Card key={it.id} color={color}>
        {src ? (
          <Pressable
            onPress={() => {
              if (it.altImageKey) {
                setFlipped((f) => {
                  const next = { ...f, [it.id]: !f[it.id] };
                  track("shop_image_flip", {
                    sku: it.id,
                    flipped: !!next[it.id],
                  });
                  return next;
                });
              }
            }}
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
              onChange={(s: any) => {
                sizeCtl.set(sizeKey, s);
                track("shop_size_change", {
                  sku: it.id,
                  sizeKey,
                  size: s,
                });
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
              <Text
                style={{ color: tokens.text as any, fontWeight: "800" }}
              >
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
              <Text
                style={{ color: tokens.text as any, fontWeight: "800" }}
              >
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
                  sizeCtl.get(sizeKey) ||
                  (getSizesFor(sizeKey)[0] ?? null);
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
                  sizeCtl.get(sizeKey) ||
                  (getSizesFor(sizeKey)[0] ?? null);
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
          {/* Shop title – with dev tap cheat in dev builds */}
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

        {/* Owned companions quick access strip */}
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {ownedCompanions.map((it: any) => {
                const isActive = activeCompanionId === it.id;
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
            renderItem(it, CATEGORY_BORDER.plushies)
          )}
        </Section>

        <Section title="Clothing">
          {groups.clothing.map((it) =>
            renderItem(it, CATEGORY_BORDER.clothing)
          )}
        </Section>

        <Section title="Tangibles">
          {groups.tangibles.map((it) =>
            renderItem(it, CATEGORY_BORDER.tangibles)
          )}
        </Section>

        {/* Companions – coin-only, digital pals (1k each) */}
        <Section title="Companions">
          {COMPANIONS.map((it: any) => {
            const owned = isOwned(it.id);
            const src = it.image;
            const priceCoins = 1_000; // all companions cost 1,000 coins now

            return (
              <Card
                key={it.id}
                color={CATEGORY_BORDER.tangibles}
              >
                {src ? (
                  <Pressable
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
                    disabled
                    style={{
                      alignItems: "center",
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: tokens.border as any,
                      backgroundColor: tokens.isDark
                        ? "rgba(148,163,184,0.16)"
                        : "rgba(148,163,184,0.12)",
                    }}
                  >
                    <Text
                      style={{
                        color: tokens.text as any,
                        fontWeight: "800",
                      }}
                    >
                      Owned ✓
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => buyWithCoins({ ...it, priceCoins })}
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
            renderItem(it, CATEGORY_BORDER.cursor, "cursor")
          )}
        </Section>

        <View
          onLayout={(e) =>
            (themeSectionY.current = e.nativeEvent.layout.y)
          }
        />
        <Section title="Themes" pulseAnim={themePulse}>
          {groups.theme.map((it) =>
            renderItem(it, CATEGORY_BORDER.theme, "theme")
          )}
        </Section>

        <Section title="Bundles">
          {groups.bundle.map((it) =>
            renderItem(it, CATEGORY_BORDER.bundle)
          )}
        </Section>

        <Section title="Coin Packs">
          {groups.coin_pack.map((it) =>
            renderItem(it, CATEGORY_BORDER.coin_pack)
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

      {/* Floating companion in bottom-right, draggable & animated */}
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
    </LinearGradient>
  );
}
