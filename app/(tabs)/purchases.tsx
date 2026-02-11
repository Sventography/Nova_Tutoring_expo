// app/(tabs)/purchases.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../context/ThemeContext";
import { useCursor } from "../context/CursorContext";
import { useUser } from "../context/UserContext";
import { showToast } from "../utils/toast";

import {
  catalog,
  CATEGORY_BORDER,
  type Category,
} from "../_lib/catalog";
import { COMPANIONS } from "../_lib/companionsCatalog";

type PurchaseMap = Record<string, true>;

// 🔐 Versioned purchases key + backward-compat (same as Shop)
const PURCHASES_KEY = "@nova/purchases.v2";
const PURCHASES_COMPAT_KEYS = ["@nova/purchases", PURCHASES_KEY];

const CURSOR_KEY = "@nova/cursor";
const THEME_KEY = "@nova/themeId";

// --------------------------- Canonical helpers ----------------------------

// Same canonId logic as in the Shop so everything lines up
function canonId(raw: string | null | undefined): string {
  if (!raw) return "";
  let v = String(raw).trim().toLowerCase();
  v = v.replace(/-/g, "_");

  if (!v.includes(":")) {
    // known cursors
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
    // known themes (short ids)
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
    // generic cursor/theme strings
    else if (v.startsWith("cursor")) {
      v = "cursor:" + v.replace(/^cursor[_:]?/, "");
    } else if (v.startsWith("theme")) {
      v = "theme:" + v.replace(/^theme[_:]?/, "");
    }
  }

  // cursor aliases
  if (v === "cursor:startrail") v = "cursor:star_trail";

  // theme aliases
  if (v === "theme:black_gold") v = "theme:blackgold";
  if (v === "theme:neon_purple") v = "theme:neonpurple";

  // long-name → base ids
  if (v === "theme:crimson_dream") v = "theme:crimson";
  if (v === "theme:emerald_wave") v = "theme:emerald";
  if (v === "theme:silver_frost") v = "theme:silver";

  return v;
}

// Map canonical theme ids to what ThemeContext expects
function toThemeCtxId(id: string | null | undefined) {
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

function normalizePurchases(
  obj: Record<string, any> | null | undefined
): PurchaseMap {
  const out: PurchaseMap = {};
  if (!obj) return out;
  for (const [k, v] of Object.entries(obj)) {
    if (!v) continue;
    const cid = canonId(k);
    if (cid) out[cid] = true;
  }
  return out;
}

async function loadPurchasesFromStorage(): Promise<Record<string, any>> {
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
      // ignore broken entries; we'll normalize later
    }
  }
  return merged;
}

async function savePurchases(m: PurchaseMap) {
  const serialized = JSON.stringify(m);
  await Promise.all(
    PURCHASES_COMPAT_KEYS.map((key) => AsyncStorage.setItem(key, serialized))
  );
}

// ----------------------------- UI helpers ---------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          color: tokens.titleText as any,
          fontSize: 16,
          fontWeight: "800",
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
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
        marginBottom: 12,
      }}
    >
      {children}
    </View>
  );
}

// ----------------------------- Screen -------------------------------------

export default function PurchasesScreen() {
  const { tokens, setThemeById } = useTheme();
  const { user } = useUser();

  // Cursor context may be fussy on web if overlay not mounted yet, so guard it
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
  const [equippedTheme, setEquippedTheme] = useState<string | null>(null);
  const [equippedCursor, setEquippedCursor] = useState<string | null>(null);

  // Load purchases + equipped theme/cursor on mount and when user changes
  useEffect(() => {
    (async () => {
      try {
        const [storageRaw, rawCursor, rawTheme] = await Promise.all([
          loadPurchasesFromStorage(),
          AsyncStorage.getItem(CURSOR_KEY),
          AsyncStorage.getItem(THEME_KEY),
        ]);

        // merge Supabase purchases (if present) with local storage
        const supaPurchRaw =
          user && (user as any).purchases && typeof (user as any).purchases === "object"
            ? ((user as any).purchases as Record<string, any>)
            : {};

        const mergedRaw = {
          ...(storageRaw || {}),
          ...(supaPurchRaw || {}),
        };

        const normalized = normalizePurchases(mergedRaw);
        setPurchases(normalized);
        // keep local storage in sync with the normalized map
        await savePurchases(normalized);

        const cur = canonId(rawCursor);
        const th = canonId(rawTheme);

        setEquippedCursor(cur || null);
        setEquippedTheme(th || null);

        const mappedTheme = toThemeCtxId(th);
        if (typeof setThemeById === "function") {
          setThemeById(mappedTheme);
        }
        if (typeof setCursorById === "function") {
          setCursorById(cur || null);
        }
      } catch {
        // ignore; worst case, screen just shows empty state
      }
    })();
  }, [setThemeById, setCursorById, user]);

  const isOwned = useCallback(
    (id: string) => {
      const cid = canonId(id);
      return !!purchases[cid];
    },
    [purchases]
  );

  const ownedThemes = useMemo(
    () => catalog.filter((it) => it.category === "theme" && isOwned(it.id)),
    [isOwned]
  );

  const ownedCursors = useMemo(
    () => catalog.filter((it) => it.category === "cursor" && isOwned(it.id)),
    [isOwned]
  );

  const ownedCompanions = useMemo(
    () => (COMPANIONS as any[]).filter((c) => isOwned(c.id)),
    [isOwned]
  );

  const ownedOther = useMemo(
    () =>
      catalog.filter((it) => {
        if (it.category === "theme" || it.category === "cursor") return false;
        return isOwned(it.id);
      }),
    [isOwned]
  );

  const hasAny =
    ownedThemes.length ||
    ownedCursors.length ||
    ownedCompanions.length ||
    ownedOther.length;

  async function equipTheme(id: string) {
    const cid = canonId(id);
    if (!cid) return;

    const mapped = toThemeCtxId(cid);
    setEquippedTheme(cid);
    try {
      await AsyncStorage.setItem(THEME_KEY, cid);
    } catch {}
    if (typeof setThemeById === "function") {
      setThemeById(mapped);
    }
    showToast("Theme equipped");
  }

  async function unequipTheme() {
    const prev = equippedTheme;
    setEquippedTheme(null);
    try {
      await AsyncStorage.removeItem(THEME_KEY);
    } catch {}
    if (typeof setThemeById === "function") {
      setThemeById(null);
    }
    if (prev) {
      showToast("Theme unequipped");
    }
  }

  async function equipCursor(id: string) {
    const cid = canonId(id);
    if (!cid) return;

    setEquippedCursor(cid);
    try {
      await AsyncStorage.setItem(CURSOR_KEY, cid);
    } catch {}
    if (typeof setCursorById === "function") {
      setCursorById(cid);
    }
    showToast("Cursor equipped");
  }

  async function unequipCursor() {
    const prev = equippedCursor;
    setEquippedCursor(null);
    try {
      await AsyncStorage.removeItem(CURSOR_KEY);
    } catch {}
    if (typeof setCursorById === "function") {
      setCursorById(null);
    }
    if (prev) {
      showToast("Cursor unequipped");
    }
  }

  return (
    <LinearGradient colors={tokens.gradient as any} style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: tokens.accent as any,
            marginBottom: 4,
          }}
        >
          Purchases
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: tokens.cardText as any,
            marginBottom: 16,
          }}
        >
          Everything you’ve unlocked in the shop lives here. Equip themes
          and cursors, or just admire your collection.
        </Text>

        {!hasAny && (
          <View
            style={{
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: tokens.border as any,
              padding: 14,
            }}
          >
            <Text
              style={{
                color: tokens.text as any,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              No purchases yet
            </Text>
            <Text
              style={{
                color: tokens.cardText as any,
                fontSize: 13,
              }}
            >
              When you unlock themes, cursors, or companions in the shop,
              they’ll show up here automatically.
            </Text>
          </View>
        )}

        {ownedThemes.length > 0 && (
          <Section title="Themes">
            {ownedThemes.map((it) => {
              const cid = canonId(it.id);
              const equipped = cid && equippedTheme && cid === equippedTheme;

              return (
                <Card key={it.id} color={CATEGORY_BORDER.theme}>
                  {it.image ? (
                    <Image
                      source={it.image}
                      style={{
                        width: "100%",
                        height: 90,
                        borderRadius: 10,
                        marginBottom: 8,
                      }}
                      resizeMode="contain"
                    />
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
                        color: tokens.cardText as any,
                        fontSize: 12,
                        lineHeight: 16,
                        marginTop: 8,
                        textAlign: "center",
                      }}
                      numberOfLines={3}
                    >
                      {it.desc}
                    </Text>
                  ) : null}

                  <View style={{ height: 10 }} />

                  <Pressable
                    onPress={() =>
                      equipped ? unequipTheme() : equipTheme(it.id)
                    }
                    style={({ pressed }) => ({
                      alignItems: "center",
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: CATEGORY_BORDER.theme,
                      backgroundColor: pressed
                        ? "rgba(56,189,248,0.25)"
                        : equipped
                        ? "rgba(56,189,248,0.22)"
                        : "transparent",
                    })}
                  >
                    <Text
                      style={{
                        color: CATEGORY_BORDER.theme,
                        fontWeight: "800",
                      }}
                    >
                      {equipped ? "Equipped ✓" : "Equip"}
                    </Text>
                  </Pressable>
                </Card>
              );
            })}
          </Section>
        )}

        {ownedCursors.length > 0 && (
          <Section title="Cursors">
            {ownedCursors.map((it) => {
              const cid = canonId(it.id);
              const equipped = cid && equippedCursor && cid === equippedCursor;

              return (
                <Card key={it.id} color={CATEGORY_BORDER.cursor}>
                  {it.image ? (
                    <Image
                      source={it.image}
                      style={{
                        width: "100%",
                        height: 90,
                        borderRadius: 10,
                        marginBottom: 8,
                      }}
                      resizeMode="contain"
                    />
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
                        color: tokens.cardText as any,
                        fontSize: 12,
                        lineHeight: 16,
                        marginTop: 8,
                        textAlign: "center",
                      }}
                      numberOfLines={3}
                    >
                      {it.desc}
                    </Text>
                  ) : null}

                  <View style={{ height: 10 }} />

                  <Pressable
                    onPress={() =>
                      equipped ? unequipCursor() : equipCursor(it.id)
                    }
                    style={({ pressed }) => ({
                      alignItems: "center",
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: CATEGORY_BORDER.cursor,
                      backgroundColor: pressed
                        ? "rgba(251,146,60,0.25)"
                        : equipped
                        ? "rgba(251,146,60,0.22)"
                        : "transparent",
                    })}
                  >
                    <Text
                      style={{
                        color: CATEGORY_BORDER.cursor,
                        fontWeight: "800",
                      }}
                    >
                      {equipped ? "Equipped ✓" : "Equip"}
                    </Text>
                  </Pressable>
                </Card>
              );
            })}
          </Section>
        )}

        {ownedCompanions.length > 0 && (
          <Section title="Companions">
            {ownedCompanions.map((it: any) => (
              <Card key={it.id} color={CATEGORY_BORDER.tangibles}>
                {it.image ? (
                  <Image
                    source={it.image}
                    style={{
                      width: "100%",
                      height: 90,
                      borderRadius: 10,
                      marginBottom: 8,
                    }}
                    resizeMode="contain"
                  />
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
                      color: tokens.cardText as any,
                      fontSize: 12,
                      lineHeight: 16,
                      marginTop: 8,
                      textAlign: "center",
                    }}
                    numberOfLines={3}
                  >
                    {it.desc}
                  </Text>
                ) : null}

                <View style={{ height: 10 }} />

                <View
                  style={{
                    alignItems: "center",
                    paddingVertical: 8,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: CATEGORY_BORDER.tangibles,
                  }}
                >
                  <Text
                    style={{
                      color: CATEGORY_BORDER.tangibles,
                      fontWeight: "800",
                    }}
                  >
                    Owned ✓
                  </Text>
                </View>
              </Card>
            ))}
          </Section>
        )}

        {ownedOther.length > 0 && (
          <Section title="Other Items">
            {ownedOther.map((it) => {
              const color =
                CATEGORY_BORDER[it.category as Category] ||
                CATEGORY_BORDER.tangibles;
              return (
                <Card key={it.id} color={color}>
                  {it.image ? (
                    <Image
                      source={it.image}
                      style={{
                        width: "100%",
                        height: 90,
                        borderRadius: 10,
                        marginBottom: 8,
                      }}
                      resizeMode="contain"
                    />
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
                        color: tokens.cardText as any,
                        fontSize: 12,
                        lineHeight: 16,
                        marginTop: 8,
                        textAlign: "center",
                      }}
                      numberOfLines={3}
                    >
                      {it.desc}
                    </Text>
                  ) : null}

                  <View
                    style={{
                      alignItems: "center",
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "transparent",
                      marginTop: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: color,
                        fontWeight: "800",
                      }}
                    >
                      Owned ✓
                    </Text>
                  </View>
                </Card>
              );
            })}
          </Section>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({});
