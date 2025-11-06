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
const QuickRow =
  (QuickRowNS as any).default ?? (QuickRowNS as any).QuickRow;

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

const REQUIRES_SHIPPING = new Set<Category>([
  "plushies",
  "clothing",
  "tangibles",
]); // route coins → /checkout/coin

/* ------------------------------- Utilities -------------------------------- */

function canonId(id: string | null | undefined): string {
  if (!id) return "";
  let v = String(id).trim();
  if (!v.includes(":")) {
    if (v.startsWith("cursor_") || v.startsWith("cursor"))
      v = "cursor:" + v.replace(/^cursor[_:]?/, "");
    else if (v.startsWith("theme_") || v.startsWith("theme"))
      v = "theme:" + v.replace(/^theme[_:]?/, "");
  }
  v = v.replace(/-/g, "_");
  if (v === "cursor:startrail" || v === "cursor_startrail")
    v = "cursor:star_trail";
  if (v === "theme:black-gold") v = "theme:blackgold";
  if (v === "theme:neon-purple") v = "theme:neonpurple";
  return v;
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

function normalizePurchases(obj: Record<string, any>): PurchaseMap {
  const out: Record<string, true> = {};
  const remap = (k: string) => {
    if (k.startsWith("cursor_")) return "cursor:" + k.slice(7);
    if (k.startsWith("theme_")) return "theme:" + k.slice(6);
    return k;
  };
  for (const [k, v] of Object.entries(obj || {})) if (v) out[remap(k)] = true;
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
    (typeof window !== "undefined" &&
      (window as any).location?.origin) ||
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

  console.log("[shop] delegating to utils/checkout with", payload);
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

/* --------------------------------- Screen -------------------------------- */
export default function Shop() {
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

  const { coins, set, add } = useCoins();
  const [purchases, setPurchases] = useState<PurchaseMap>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [equippedCursor, setEquippedCursor] = useState<string | null>(null);
  const [equippedTheme, setEquippedTheme] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [need, setNeed] = useState<number>(0);
  const [showInsufficient, setShowInsufficient] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const sizeCtl = useSelectedSizes();

  const themeSectionY = useRef<number>(0);
  const cursorSectionY = useRef<number>(0);

  const themePulse = useRef(new Animated.Value(0)).current;
  const cursorPulse = useRef(new Animated.Value(0)).current;

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
      const durMs = Date.now() - mountTs;
      track("shop_unview", { duration_ms: durMs });
    };
  }, []);

  /* --------------------------- Initial data load -------------------------- */
  useEffect(() => {
    (async () => {
      const [ pRaw, cur, th, ord] = await Promise.all([
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
      setEquippedCursor(cur);
      setEquippedTheme(th);
      setOrders(ord);

      const mappedCursor = toCursorCtxId(cur);
      if (typeof setCursorById === "function") setCursorById(mappedCursor);
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
    const onUrl = (event: { url: string }) => {
      const { queryParams, path } = Linking.parse(event.url);
      const sku = (queryParams?.sku as string) || "";
      track("shop_return_deeplink", { url: event.url, path, sku });
      if (!sku) return;
      const it = catalog.find((x) => x.id === sku);
      if (!it) return;

      if (it.category === "theme" || it.category === "cursor" || it.category === "bundle") {
        setPurchases((prev) => {
          const cid = canonId(it.id);
          const next = { ...prev, [it.id]: true } as PurchaseMap;
          if (cid && cid !== it.id) (next as any)[cid] = true;
          savePurchases(next);
          track("shop_purchase_complete", { sku: it.id, category: it.category, mode: "stripe" });
          return next;
        });
        if (it.category === "theme") equipThemeImmediate(it.id, { source: "deeplink" });
        if (it.category === "cursor") void equipCursorImmediate(it.id, { source: "deeplink" });
      } else if (it.category === "coin_pack") {
        const add = dollarsToCoins(it.priceUSD ?? 0);
        const nextCoins = coins + add;
        setCoins(nextCoins);
        saveCoins(nextCoins);
        track("shop_coins_added", { amount: add, via: "stripe", sku: it.id });
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
      }
    };
    const sub = RNLinking.addEventListener("url", onUrl);
    Linking.getInitialURL().then((url) => url && onUrl({ url }));
    return () => sub.remove();
  }, [coins]);

  /* ------------------------ Coin polling (lightweight) -------------------- */
  
  /* -------------------------- Equip helpers ------------------------------- */
  function toCursorCtxId(shopId: string | null) {
    if (!shopId) return null;
    const map: Record<string, string> = {
      "cursor:glow": "glowCursor",
      "cursor:orb": "orbCursor",
      "cursor:star_trail": "starTrailCursor",
    };
    return map[shopId] ?? (shopId.startsWith("cursor:") ? shopId.slice(7) : shopId);
  }

  function toThemeCtxId(id: string | null) {
    if (!id) return null;
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
    return map[id] ?? (id.startsWith("theme:") ? id.slice(6) : id);
  }

  function markOwned(id: string) {
    const cid = canonId(id);
    setPurchases((prev) => {
      const next = { ...prev, [id]: true } as PurchaseMap;
      if (cid && cid !== id) (next as any)[cid] = true;
      savePurchases(next);
      track("shop_owned_marked", { id, owned_count: Object.keys(next).length });
      return next;
    });
  }

  function equipThemeImmediate(shopThemeId: string, meta?: Record<string, any>) {
    setEquippedTheme(shopThemeId);
    saveTheme(shopThemeId);
    const mapped = toThemeCtxId(shopThemeId);
    if (typeof setThemeById === "function") setThemeById(mapped);
    track("shop_equip", { kind: "theme", id: shopThemeId, mapped, ...meta });
  }

  function unequipThemeImmediate(meta?: Record<string, any>) {
    const prev = equippedTheme;
    setEquippedTheme(null);
    saveTheme(null);
    if (typeof setThemeById === "function") setThemeById(null);
    track("shop_unequip", { kind: "theme", id: prev });
  }

  async function equipCursorImmediate(shopId: string, meta?: Record<string, any>) {
    setEquippedCursor(shopId);
    await saveCursor(shopId);
    const mapped = toCursorCtxId(shopId);
    if (mapped && typeof setCursorById === "function") setCursorById(mapped);
    track("shop_equip", { kind: "cursor", id: shopId, mapped, ...meta });
  }

  async function unequipCursorImmediate(meta?: Record<string, any>) {
    const prev = equippedCursor;
    setEquippedCursor(null);
    await saveCursor(null);
    if (typeof setCursorById === "function") setCursorById(null);
    track("shop_unequip", { kind: "cursor", id: prev });
  }

  /* ----------------------------- Quick menus ------------------------------ */
  const THEMES_MENU: QuickItem[] = useMemo(() => {
    const p = purchases;
    const eq = equippedTheme;
    return [
      { id: "theme:neon", name: "Neon Nova", kind: "theme", owned: !!p["theme:neon"], equipped: eq === "theme:neon" },
      { id: "theme:starry", name: "Starry Night", kind: "theme", owned: !!p["theme:starry"], equipped: eq === "theme:starry" },
      { id: "theme:pink", name: "Pink Dawn", kind: "theme", owned: !!p["theme:pink"], equipped: eq === "theme:pink" },
      { id: "theme:dark", name: "Dark Nova", kind: "theme", owned: !!p["theme:dark"], equipped: eq === "theme:dark" },
      { id: "theme:mint", name: "Mint Breeze", kind: "theme", owned: !!p["theme:mint"], equipped: eq === "theme:mint" },
      { id: "theme:glitter", name: "Glitter", kind: "theme", owned: !!p["theme:glitter"], equipped: eq === "theme:glitter" },
      { id: "theme:blackgold", name: "Black & Gold", kind: "theme", owned: !!p["theme:blackgold"], equipped: eq === "theme:blackgold" },
      { id: "theme:crimson", name: "Crimson Dream", kind: "theme", owned: !!p["theme:crimson"], equipped: eq === "theme:crimson" },
      { id: "theme:emerald", name: "Emerald Wave", kind: "theme", owned: !!p["theme:emerald"], equipped: eq === "theme:emerald" },
      { id: "theme:neonpurple", name: "Neon Purple", kind: "theme", owned: !!p["theme:neonpurple"], equipped: eq === "theme:neonpurple" },
      { id: "theme:silver", name: "Silver Frost", kind: "theme", owned: !!p["theme:silver"], equipped: eq === "theme:silver" },
    ];
  }, [purchases, equippedTheme]);

  const CURSORS_MENU: QuickItem[] = useMemo(() => {
    const p = purchases;
    const eq = equippedCursor;
    return [
      { id: "cursor:glow", name: "Glow Cursor", kind: "cursor", owned: !!p["cursor:glow"], equipped: eq === "cursor:glow" },
      { id: "cursor:orb", name: "Orb Glow", kind: "cursor", owned: !!p["cursor:orb"], equipped: eq === "cursor:orb" },
      { id: "cursor:star_trail", name: "Star Trail", kind: "cursor", owned: !!p["cursor:star_trail"], equipped: eq === "cursor:star_trail" },
    ];
  }, [purchases, equippedCursor]);

  function quickEquip(id: string, kind: "theme" | "cursor") {
    const isCurrentlyEq = kind === "theme" ? equippedTheme === id : equippedCursor === id;
    track("shop_quick_action", {
      action: isCurrentlyEq ? "unequip" : "equip",
      id,
      kind,
      source: "quick_row",
    });
    if (kind === "theme") {
      isCurrentlyEq
        ? unequipThemeImmediate({ source: "quick_row" })
        : equipThemeImmediate(id, { source: "quick_row" });
    } else {
      isCurrentlyEq
        ? void unequipCursorImmediate({ source: "quick_row" })
        : void equipCursorImmediate(id, { source: "quick_row" });
    }
  }

  function quickBuy(id: string) {
    const kindGuess: "theme" | "cursor" | "other" = id.startsWith("theme:")
      ? "theme"
      : id.startsWith("cursor:")
      ? "cursor"
      : "other";
    track("shop_quick_action", {
      action: "unlock_click",
      id,
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
    const it = catalog.find((x) => x.id === id);
    if (it?.priceUSD) {
      const amount = Math.round((it.priceUSD ?? 1) * 100);
      const success = Linking.createURL("/", { queryParams: { sku: id } });
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
    track("shop_modal_insufficient_shown", { needed: 1000, via: "quick_row" });
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

    // Route to shipping form for physical items (+ size)
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
        size: chosen, // <— NEW
      });
      return;
    }

    // Instant unlock for digital goods
    if (coins < price) {
      setNeed(price - coins);
      setShowInsufficient(true);
      track("shop_modal_insufficient_shown", {
        needed: price - coins,
        sku: it.id,
        via: "coins",
      });
      return;
    }
    const nextCoins = coins - price;
    const cid = canonId(it.id);
    const nextPurch = { ...purchases, [it.id]: true, [cid]: true } as PurchaseMap;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCoins(nextCoins);
    saveCoins(nextCoins);
    setPurchases(nextPurch);
    savePurchases(nextPurch);
    markOwned(it.id);
    track("shop_purchase_complete", {
      sku: it.id,
      category: it.category,
      mode: "coins",
      price,
    });

    if (it.category === "theme")
      equipThemeImmediate(it.id, { source: "coins_purchase" });
    if (it.category === "cursor")
      void equipCursorImmediate(it.id, { source: "coins_purchase" });
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
    // optimistic unlock; deeplink will also mark
    markOwned(it.id);
  }

  function equipTheme(it: any) {
    if (!purchases[it.id]) return;
    equipThemeImmediate(it.id, { source: "card_equip" });
  }

  async function equipCursor(it: any) {
    if (!purchases[it.id]) return;
    await equipCursorImmediate(it.id, { source: "card_equip" });
  }

  /* ----------------------------- Render helpers --------------------------- */
  const renderItem = (it: any, color: string, equipable?: "theme" | "cursor") => {
    const owned = !!purchases[canonId(it.id)];
    const showAlt = flipped[it.id] && it.altImageKey && altImages[it.altImageKey];
    const src = showAlt ? altImages[it.altImageKey!] : it.image;

    const sizeKey =
      it.stripeProductId ||
      it.productId ||
      (it.stripe && it.stripe.productId) ||
      it.id;
    let sizes = getSizesFor(sizeKey);
    if (!sizes.length && it.category === "clothing")
      sizes = ["S", "M", "L", "XL"];
    const selected = sizes.length ? (sizeCtl.get(sizeKey) || sizes[0]) : null;

    const equipped =
      equipable === "theme"
        ? equippedTheme === it.id
        : equipable === "cursor"
        ? equippedCursor === it.id
        : false;

    return (
      <Card key={it.id} color={color}>
        {src ? (
          <Pressable
            onPress={() => {
              if (it.altImageKey) {
                setFlipped((f) => {
                  const next = { ...f, [it.id]: !f[it.id] };
                  track("shop_image_flip", { sku: it.id, flipped: !!next[it.id] });
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
            <Text style={{ color: tokens.text as any, fontSize: 12, marginBottom: 6 }}>
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
                const chosen = sizeCtl.get(sizeKey) || (getSizesFor(sizeKey)[0] ?? null);
                buyWithCoins(it, { size: chosen }); // <— routes to /checkout/coin for physicals
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
                const chosen = sizeCtl.get(sizeKey) || (getSizesFor(sizeKey)[0] ?? null);
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
            justifyContent: "space_between",
            paddingHorizontal: 16,
            paddingTop: 8,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: tokens.text as any, fontSize: 24, fontWeight: "800" }}>
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
            <Text style={{ color: tokens.text as any, fontSize: 14, fontWeight: "700" }}>
              {(coins ?? 0).toLocaleString()} coins
            </Text>
          </View>
        </View>

        <View data-quick-rows style={{ marginBottom: 16 }}>
          <QuickRow title="Themes" items={THEMES_MENU} onEquip={quickEquip} onBuy={quickBuy} />
          <QuickRow title="Cursors" items={CURSORS_MENU} onEquip={quickEquip} onBuy={quickBuy} />
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

        <View onLayout={(e) => (cursorSectionY.current = e.nativeEvent.layout.y)} />
        <Section title="Cursors" pulseAnim={cursorPulse}>
          {groups.cursor.map((it) =>
            renderItem(it, CATEGORY_BORDER.cursor, "cursor")
          )}
        </Section>

        <View onLayout={(e) => (themeSectionY.current = e.nativeEvent.layout.y)} />
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
                <Text style={{ color: tokens.text as any, fontWeight: "700" }}>
                  {o.title}
                </Text>
                <Text style={{ color: tokens.text as any, fontSize: 12, marginTop: 16 }}>
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
        onClose={() => {
          setShowInsufficient(false);
          track("shop_modal_insufficient_closed");
        }}
        onBuyCoins={() => {
          setShowInsufficient(false);
          track("shop_modal_insufficient_buy_coins");
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
        }}
      />
    </LinearGradient>
  );
}
