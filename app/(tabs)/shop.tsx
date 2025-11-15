// app/(tabs)/shop.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCoins } from "../context/CoinsContext";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking as RNLinking,
  Image,
  LayoutAnimation,
  Animated,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

// Optional dev helpers (safe if missing)
import DevThemeSwitcher from "../components/DevThemeSwitcher";
import ThemeProbe from "../components/ThemeProbe";

import { useTheme } from "../context/ThemeContext";
import { useCursor } from "../context/CursorContext";

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

// $ checkout (stripe/USD)
import { startCheckout } from "../utils/checkout";
// 🪙 coin checkout (route to shipping form)
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

const COINS_KEY = "@nova/coins.v1";
const PURCHASES_KEY = "@nova/purchases";
const CURSOR_KEY = "@nova/cursor";
const THEME_KEY = "@nova/themeId";
const ORDERS_KEY = "@nova/orders";

const REQUIRES_SHIPPING = new Set<Category>(["plushies", "clothing", "tangibles"]);

/* ------------------------------- Canonical IDs ---------------------------- */
// Final canonical keys we store & check: "theme:black-and-gold", "cursor:star-trail", etc.
function canonId(id: string | null | undefined): string {
  if (!id) return "";
  let s = String(id).trim().toLowerCase();

  // add namespace if missing and a common prefix exists
  if (!s.includes(":")) {
    if (/^cursor[_:-]?/i.test(s)) s = "cursor:" + s.replace(/^cursor[_:-]?/i, "");
    else if (/^theme[_:-]?/i.test(s)) s = "theme:" + s.replace(/^theme[_:-]?/i, "");
  }

  // split namespace
  const m = s.match(/^(cursor|theme):(.+)$/);
  let ns: "cursor" | "theme" | "" = "";
  let body = s;
  if (m) {
    ns = m[1] as any;
    body = m[2];
  }

  // normalize body: spaces/underscores to dashes; & → -and-
  body = body.replace(/\s*&\s*/g, "-and-");
  body = body.replace(/[\s_]+/g, "-").replace(/-+/g, "-");
  body = body.replace(/[^a-z0-9-]/g, "").replace(/^-|-$/g, "");

  // alias fixes
  const alias: Record<string, string> = {
    "black-gold": "black-and-gold",
    "startrail": "star-trail",
    "neonpurple": "neon-purple",
  };
  body = alias[body] || body;

  return ns ? `${ns}:${body}` : body;
}

const track = (event: string, props?: Record<string, any>) => {
  try {
    (globalThis as any).novaTrack?.(event, props ?? {});
  } catch {}
};

// AsyncStorage helpers
async function loadCoins(): Promise<number> {
  const v = await AsyncStorage.getItem(COINS_KEY);
  return v ? parseInt(v, 10) : 0;
}
async function saveCoins(n: number) {
  await AsyncStorage.setItem(COINS_KEY, String(n));
}
async function loadPurchases(): Promise<PurchaseMap> {
  const v = await AsyncStorage.getItem(PURCHASES_KEY);
  try {
    return v ? JSON.parse(v) : {};
  } catch {
    return {};
  }
}
async function savePurchases(m: PurchaseMap) {
  await AsyncStorage.setItem(PURCHASES_KEY, JSON.stringify(m));
}
async function loadCursor(): Promise<string | null> {
  return (await AsyncStorage.getItem(CURSOR_KEY)) || null;
}
async function saveCursor(key: string | null) {
  if (key) {
    await AsyncStorage.setItem(CURSOR_KEY, key);
  } else {
    await AsyncStorage.removeItem(CURSOR_KEY);
  }
}
async function loadTheme(): Promise<string | null> {
  return (await AsyncStorage.getItem(THEME_KEY)) || null;
}
async function saveTheme(id: string | null) {
  if (id) {
    await AsyncStorage.setItem(THEME_KEY, id);
  } else {
    await AsyncStorage.removeItem(THEME_KEY);
  }
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

// Canonicalize whatever is already in storage
function normalizePurchases(obj: Record<string, any>): PurchaseMap {
  const out: Record<string, true> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (!v) continue;
    out[canonId(k)] = true;
  }
  return out;
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
            color: tokens.text as any,
            fontSize: 16,
            fontWeight: "800",
            marginBottom: 10,
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
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    ).start();
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
                <Text style={{ color: "#CFFFFF", fontWeight: "900" }}>Continue</Text>
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
  const { coins, setCoins } = useCoins();
  const { tokens, setThemeById } = useTheme();
  const router = useRouter();

  const cursorApi = (() => {
    try {
      return useCursor();
    } catch {
      return null as any;
    }
  })();
  const setCursorById = cursorApi?.setCursorById as
    | undefined
    | ((id: string | null) => void);

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

  /* ---------- DEV: Hidden 5-tap top-up ---------- */
  const tapCounter = useRef(0);
  const tapWindowMs = 1500;
  const lastTapAt = useRef(0);
  function secretTopUp() {
    const now = Date.now();
    if (now - lastTapAt.current > tapWindowMs) tapCounter.current = 0;
    tapCounter.current += 1;
    lastTapAt.current = now;
    if (tapCounter.current >= 5) {
      tapCounter.current = 0;
      const bonus = 250_000;
      const next = (coins ?? 0) + bonus;
      setCoins(next);
      saveCoins(next);
      track("dev_secret_top_up", { bonus, next });
    }
  }

  const runPulse = (which: "themes" | "cursors") => {
    const anim = which === "themes" ? themePulse : cursorPulse;
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 0, duration: 350, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 0, duration: 420, useNativeDriver: false }),
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
      track("shop_unview", { duration_ms: Date.now() - mountTs });
    };
  }, []);

  /* --------------------------- Initial data load -------------------------- */
  useEffect(() => {
    (async () => {
      const [c, pRaw, cur, th, ord] = await Promise.all([
        loadCoins(),
        loadPurchases(),
        loadCursor(),
        loadTheme(),
        loadOrders(),
      ]);

      const p = normalizePurchases(pRaw);
      if (JSON.stringify(p) !== JSON.stringify(pRaw)) await savePurchases(p);

      setCoins(c);
      setPurchases(p);
      setEquippedCursor(cur ? canonId(cur) : null);
      setEquippedTheme(th ? canonId(th) : null);
      setOrders(ord);

      const mappedCursor = toCursorCtxId(cur ? canonId(cur) : null);
      if (typeof setCursorById === "function") setCursorById(mappedCursor);
      const mappedTheme = toThemeCtxId(th ? canonId(th) : null);
      if (typeof setThemeById === "function") setThemeById(mappedTheme);

      track("shop_state_hydrated", {
        coins: c,
        purchases_count: Object.keys(p).length,
        cursor: cur,
        theme: th,
        orders: ord.length,
      });
    })();
  }, []);

  useEffect(() => {
    const mapped = toCursorCtxId(equippedCursor);
    if (typeof setCursorById === "function") setCursorById(mapped);
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

      if (
        it.category === "theme" ||
        it.category === "cursor" ||
        it.category === "bundle"
      ) {
        const cid = canonId(it.id);
        setPurchases((prev) => {
          const next = { ...prev, [cid]: true } as PurchaseMap;
          savePurchases(next);
          track("shop_purchase_complete", {
            sku: cid,
            category: it.category,
            mode: "stripe",
          });
          return next;
        });
        if (it.category === "theme") equipThemeImmediate(cid, { source: "deeplink" });
        if (it.category === "cursor") equipCursorImmediate(cid, { source: "deeplink" });
      } else if (it.category === "coin_pack") {
        const addAmt = dollarsToCoins(it.priceUSD ?? 0);
        const nextCoins = (coins ?? 0) + addAmt;
        setCoins(nextCoins);
        await saveCoins(nextCoins);
        track("shop_coins_added", {
          amount: addAmt,
          via: "stripe",
          sku: it.id,
        });
      } else {
        const order: Order = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sku: it.id,
          title: it.title,
          status: "paid",
          createdAt: Date.now(),
        };
        setOrders((prev) => {
          const next = [order, ...prev];
          saveOrders(next);
          track("shop_order_created", { sku: it.id, title: it.title });
          return next;
        });
        setLastOrderTitle(it.title);
        setShowOrderSuccess(true);
      }
    };

    const sub = RNLinking.addEventListener("url", onUrl);
    Linking.getInitialURL().then((url) => url && onUrl({ url }));
    return () => sub.remove();
  }, [coins]);

  /* -------------------------- Equip helpers ------------------------------- */
  function toCursorCtxId(shopId: string | null) {
    if (!shopId) return null;
    const id = canonId(shopId);
    const map: Record<string, string> = {
      "cursor:glow": "glowCursor",
      "cursor:orb": "orbCursor",
      "cursor:star-trail": "starTrailCursor",
      "cursor:star_trail": "starTrailCursor", // legacy
    };
    return map[id] ?? (id.startsWith("cursor:") ? id.slice(7) : id);
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
      "theme:black-and-gold": "theme:blackgold", // canonical → existing theme key
      "theme:blackgold": "theme:blackgold", // legacy
      "theme:crimson": "crimson",
      "theme:emerald": "emerald",
      "theme:neon-purple": "theme:neonpurple",
      "theme:neonpurple": "theme:neonpurple", // legacy
      "theme:silver": "silver",
    };
    return map[cid] ?? (cid.startsWith("theme:") ? cid.slice(6) : cid);
  }

  function markOwned(id: string) {
    const cid = canonId(id);
    setPurchases((prev) => {
      const next = { ...prev, [cid]: true } as PurchaseMap;
      savePurchases(next);
      track("shop_owned_marked", {
        id: cid,
        owned_count: Object.keys(next).length,
      });
      return next;
    });
  }

  function equipThemeImmediate(shopThemeId: string, meta?: Record<string, any>) {
    const cid = canonId(shopThemeId);
    setEquippedTheme(cid);
    saveTheme(cid);
    const mapped = toThemeCtxId(cid);
    if (typeof setThemeById === "function") setThemeById(mapped);
    track("shop_equip", { kind: "theme", id: cid, mapped, ...meta });
  }

  function unequipThemeImmediate(meta?: Record<string, any>) {
    const prev = equippedTheme;
    setEquippedTheme(null);
    saveTheme(null);
    if (typeof setThemeById === "function") setThemeById(null);
    track("shop_unequip", { kind: "theme", id: prev });
  }

  // Make cursor equip/unequip fully sync from the React side;
  // we don't need to await the storage writes.
  function equipCursorImmediate(shopId: string, meta?: Record<string, any>) {
    const cid = canonId(shopId);
    setEquippedCursor(cid);
    // fire-and-forget storage
    saveCursor(cid).catch(() => {});
    const mapped = toCursorCtxId(cid);
    if (mapped && typeof setCursorById === "function") setCursorById(mapped);
    track("shop_equip", { kind: "cursor", id: cid, mapped, ...meta });
  }

  function unequipCursorImmediate(meta?: Record<string, any>) {
    const prev = equippedCursor;
    setEquippedCursor(null);
    saveCursor(null).catch(() => {});
    if (typeof setCursorById === "function") setCursorById(null);
    track("shop_unequip", { kind: "cursor", id: prev });
  }

  /* ----------------------------- Quick menus ------------------------------ */
  const THEMES_MENU: QuickItem[] = useMemo(() => {
    const p = purchases;
    const eq = equippedTheme;
    return [
      {
        id: "theme:neon",
        name: "Neon Nova",
        kind: "theme",
        owned: !!p["theme:neon"],
        equipped: eq === "theme:neon",
      },
      {
        id: "theme:starry",
        name: "Starry Night",
        kind: "theme",
        owned: !!p["theme:starry"],
        equipped: eq === "theme:starry",
      },
      {
        id: "theme:pink",
        name: "Pink Dawn",
        kind: "theme",
        owned: !!p["theme:pink"],
        equipped: eq === "theme:pink",
      },
      {
        id: "theme:dark",
        name: "Dark Nova",
        kind: "theme",
        owned: !!p["theme:dark"],
        equipped: eq === "theme:dark",
      },
      {
        id: "theme:mint",
        name: "Mint Breeze",
        kind: "theme",
        owned: !!p["theme:mint"],
        equipped: eq === "theme:mint",
      },
      {
        id: "theme:glitter",
        name: "Glitter",
        kind: "theme",
        owned: !!p["theme:glitter"],
        equipped: eq === "theme:glitter",
      },
      {
        id: "theme:black-and-gold",
        name: "Black & Gold",
        kind: "theme",
        owned: !!p["theme:black-and-gold"],
        equipped: eq === "theme:black-and-gold",
      },
      {
        id: "theme:crimson",
        name: "Crimson Dream",
        kind: "theme",
        owned: !!p["theme:crimson"],
        equipped: eq === "theme:crimson",
      },
      {
        id: "theme:emerald",
        name: "Emerald Wave",
        kind: "theme",
        owned: !!p["theme:emerald"],
        equipped: eq === "theme:emerald",
      },
      {
        id: "theme:neon-purple",
        name: "Neon Purple",
        kind: "theme",
        owned: !!p["theme:neon-purple"],
        equipped: eq === "theme:neon-purple",
      },
      {
        id: "theme:silver",
        name: "Silver Frost",
        kind: "theme",
        owned: !!p["theme:silver"],
        equipped: eq === "theme:silver",
      },
    ];
  }, [purchases, equippedTheme]);

  const CURSORS_MENU: QuickItem[] = useMemo(() => {
    const p = purchases;
    const eq = equippedCursor;
    return [
      {
        id: "cursor:glow",
        name: "Glow Cursor",
        kind: "cursor",
        owned: !!p["cursor:glow"],
        equipped: eq === "cursor:glow",
      },
      {
        id: "cursor:orb",
        name: "Orb Glow",
        kind: "cursor",
        owned: !!p["cursor:orb"],
        equipped: eq === "cursor:orb",
      },
      {
        id: "cursor:star-trail",
        name: "Star Trail",
        kind: "cursor",
        owned: !!p["cursor:star-trail"],
        equipped: eq === "cursor:star-trail",
      },
    ];
  }, [purchases, equippedCursor]);

  function quickEquip(id: string, kind: "theme" | "cursor") {
    const cid = canonId(id);
    const isCurrentlyEq =
      kind === "theme" ? equippedTheme === cid : equippedCursor === cid;
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
        ? unequipCursorImmediate({ source: "quick_row" })
        : equipCursorImmediate(cid, { source: "quick_row" });
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
    if (kindGuess === "theme") {
      scrollTo(themeSectionY.current, { section: "themes" });
      return;
    }
    if (kindGuess === "cursor") {
      scrollTo(cursorSectionY.current, { section: "cursors" });
      return;
    }
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
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
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

  // 🪙 Coins path:
  // - Digital (themes/cursors) → instant unlock (local)
  // - Physical (plushies/clothing/tangibles) → navigate to /checkout/coin (shipping form) and pass size
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
      startCoinCheckout({
        id: it.id,
        title: it.title,
        priceCoins: price,
        imageUrl: undefined,
        category: it.category,
        size: chosen,
      });
      return;
    }

    // Digital unlock
    if ((coins ?? 0) < price) {
      setNeed(price - (coins ?? 0));
      setShowInsufficient(true);
      track("shop_modal_insufficient_shown", {
        needed: price - (coins ?? 0),
        sku: it.id,
        via: "coins",
      });
      return;
    }

    const nextCoins = (coins ?? 0) - price;
    const cid = canonId(it.id);
    const nextPurch = { ...purchases, [cid]: true } as PurchaseMap;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCoins(nextCoins);
    saveCoins(nextCoins);
    setPurchases(nextPurch);
    savePurchases(nextPurch);
    markOwned(cid);
    track("shop_purchase_complete", {
      sku: cid,
      category: it.category,
      mode: "coins",
      price,
    });

    if (it.category === "theme")
      equipThemeImmediate(cid, { source: "coins_purchase" });
    if (it.category === "cursor")
      equipCursorImmediate(cid, { source: "coins_purchase" });
  }

  async function moneyBuy(it: any, meta?: { size?: string }) {
    const amount = Math.round((it.priceUSD ?? 1) * 100);
    const success = Linking.createURL("/", {
      queryParams: { sku: it.id, size: meta?.size || "" },
    });
    track("shop_money_buy", { sku: it.id, amount_cents: amount, meta });
    await startCheckoutRequest({
      amount,
      currency: "usd",
      success_url: success,
      cancel_url: success,
    });
    // Optimistic unlock for digital; physicals handled via deeplink/coin checkout
    if (
      it.category === "theme" ||
      it.category === "cursor" ||
      it.category === "bundle"
    )
      markOwned(it.id);
  }

  function equipTheme(it: any) {
    const cid = canonId(it.id);
    if (!purchases[cid]) return;
    equipThemeImmediate(cid, { source: "card_equip" });
  }

  function equipCursor(it: any) {
    const cid = canonId(it.id);
    if (!purchases[cid]) return;
    equipCursorImmediate(cid, { source: "card_equip" });
  }

  /* ----------------------------- Render helpers --------------------------- */
  const renderItem = (it: any, color: string, equipable?: "theme" | "cursor") => {
    const cid = canonId(it.id);
    const owned = !!purchases[cid];
    const showAlt = flipped[it.id] && it.altImageKey && altImages[it.altImageKey];
    const src = showAlt ? altImages[it.altImageKey!] : it.image;

    const sizeKey =
      it.stripeProductId ||
      it.productId ||
      (it.stripe && it.stripe.productId) ||
      it.id;
    let sizes = getSizesFor(sizeKey);
    if (!sizes.length && it.category === "clothing") sizes = ["S", "M", "L", "XL"];
    const selected = sizes.length ? sizeCtl.get(sizeKey) || sizes[0] : null;

    const equipped =
      equipable === "theme"
        ? equippedTheme === cid
        : equipable === "cursor"
        ? equippedCursor === cid
        : false;

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
                track("shop_size_change", { sku: it.id, sizeKey, size: s });
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
                  ? "rgba(92,252,200,0.15)"
                  : "rgba(92,252,200,0.08)",
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
        ) : equipable === "cursor" ? (
          owned ? (
            <Pressable
              onPress={() =>
                equipped
                  ? unequipCursorImmediate({ source: "card_button" })
                  : equipCursor(it)
              }
              style={({ pressed }) => ({
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: tokens.border as any,
                backgroundColor: pressed
                  ? "rgba(92,252,200,0.15)"
                  : "rgba(92,252,200,0.08)",
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
                const sizeKey =
                  it.stripeProductId ||
                  it.productId ||
                  (it.stripe && it.stripe.productId) ||
                  it.id;
                const chosen =
                  sizeCtl.get(sizeKey) || (getSizesFor(sizeKey)[0] ?? null);
                buyWithCoins(it, { size: chosen });
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
                const sizeKey =
                  it.stripeProductId ||
                  it.productId ||
                  (it.stripe && it.stripe.productId) ||
                  it.id;
                const chosen =
                  sizeCtl.get(sizeKey) || (getSizesFor(sizeKey)[0] ?? null);
                moneyBuy(it, { size: chosen });
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
    <LinearGradient colors={["#000000", "#001528"]} style={{ flex: 1 }}>
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
            paddingHorizontal: 16,
            paddingTop: 8,
            marginBottom: 12,
          }}
        >
          <Text
            onPress={secretTopUp}
            style={{
              color: tokens.text as any,
              fontSize: 24,
              fontWeight: "800",
            }}
          >
            Shop
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: tokens.border as any,
              backgroundColor: "rgba(0,229,255,0.1)",
            }}
          >
            <Text
              style={{
                color: tokens.text as any,
                fontSize: 14,
                fontWeight: "700",
              }}
            >
              {(coins ?? 0).toLocaleString()} coins
            </Text>
          </View>
        </View>

        <View data-quick-rows style={{ marginBottom: 16 }}>
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

        <View
          onLayout={(e) => (cursorSectionY.current = e.nativeEvent.layout.y)}
        />
        <Section title="Cursors" pulseAnim={cursorPulse}>
          {groups.cursor.map((it) =>
            renderItem(it, CATEGORY_BORDER.cursor, "cursor")
          )}
        </Section>

        <View
          onLayout={(e) => (themeSectionY.current = e.nativeEvent.layout.y)}
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
                color: tokens.text as any,
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
                  backgroundColor: "rgba(255,255,255,0.03)",
                }}
              >
                <Text
                  style={{ color: tokens.text as any, fontWeight: "700" }}
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
