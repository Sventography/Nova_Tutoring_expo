// app/(tabs)/purchases.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../context/ThemeContext";
import { useCursor } from "../context/CursorContext";
import { usePurchases } from "../context/PurchasesContext";
import { useCompanion } from "../context/CompanionContext";
import { showToast } from "../utils/toast";

import {
  catalog,
  CATEGORY_BORDER,
  type Category,
} from "../_lib/catalog";
import { COMPANIONS } from "../_lib/companionsCatalog";

/* --------------------------- Canonical helpers ---------------------------- */

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

/* ----------------------------- UI helpers --------------------------------- */

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

/* ----------------------------- Screen ------------------------------------- */

export default function PurchasesScreen() {
  const { tokens, themeId, setThemeById } = useTheme();
  const { isOwned } = usePurchases();
  const {
    activeCompanionId,
    equipCompanion,
    clearCompanion,
  } = useCompanion();

  // Cursor context may be fussy on web if overlay not mounted yet, so guard it
  const cursorApi = (() => {
    try {
      return useCursor();
    } catch {
      return null as any;
    }
  })();

  const cursorId: string | null = cursorApi?.cursorId ?? null;
  const setCursorById = cursorApi?.setCursorById as
    | undefined
    | ((id: string | null) => void);

  // canonical "equipped" ids from the contexts
  const equippedTheme = canonId(themeId as any);
  const equippedCursor = canonId(cursorId as any);
  const equippedCompanion = canonId(
    activeCompanionId as any
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

    // ThemeContext handles canonicalization + per-user storage
    setThemeById(cid);
    showToast("Theme equipped");
  }

  async function unequipTheme() {
    // Reset to default theme (ThemeContext will pick the default)
    setThemeById(null);
    showToast("Theme reset");
  }

  async function equipCursor(id: string) {
    if (!setCursorById) return;
    const cid = canonId(id);
    if (!cid) return;

    setCursorById(cid);
    showToast("Cursor equipped");
  }

  async function unequipCursor() {
    if (!setCursorById) return;
    setCursorById(null);
    showToast("Cursor unequipped");
  }

  async function equipOwnedCompanion(
    id: string
  ) {
    const cid = canonId(id);
    if (!cid) return;

    await equipCompanion(cid);
    showToast("Companion equipped");
  }

  async function unequipOwnedCompanion() {
    await clearCompanion();
    showToast("Companion unequipped");
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
          Everything you’ve unlocked in the shop lives here. Equip or
          unequip themes, cursors, and companions whenever you like.
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
              const isEquipped = cid && equippedTheme && cid === equippedTheme;

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
                      isEquipped ? unequipTheme() : equipTheme(it.id)
                    }
                    style={({ pressed }) => ({
                      alignItems: "center",
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: CATEGORY_BORDER.theme,
                      backgroundColor: pressed
                        ? "rgba(56,189,248,0.25)"
                        : isEquipped
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
                      {isEquipped ? "Equipped ✓" : "Equip"}
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
              const isEquipped =
                cid && equippedCursor && cid === equippedCursor;

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
                      isEquipped ? unequipCursor() : equipCursor(it.id)
                    }
                    style={({ pressed }) => ({
                      alignItems: "center",
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: CATEGORY_BORDER.cursor,
                      backgroundColor: pressed
                        ? "rgba(251,146,60,0.25)"
                        : isEquipped
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
                      {isEquipped ? "Equipped ✓" : "Equip"}
                    </Text>
                  </Pressable>
                </Card>
              );
            })}
          </Section>
        )}

        {ownedCompanions.length > 0 && (
          <Section title="Companions">
            {ownedCompanions.map((it: any) => {
              const cid = canonId(it.id);
              const isEquipped =
                !!cid &&
                !!equippedCompanion &&
                cid === equippedCompanion;

              return (
                <Card
                  key={it.id}
                  color={
                    isEquipped
                      ? "#FACC15"
                      : CATEGORY_BORDER.tangibles
                  }
                >
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
                      isEquipped
                        ? void unequipOwnedCompanion()
                        : void equipOwnedCompanion(
                            it.id
                          )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${
                      isEquipped
                        ? "Unequip"
                        : "Equip"
                    } ${it.title}`}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isEquipped
                        ? "#FACC15"
                        : CATEGORY_BORDER.tangibles,
                      backgroundColor: pressed
                        ? isEquipped
                          ? "rgba(250,204,21,0.22)"
                          : "rgba(56,189,248,0.22)"
                        : isEquipped
                        ? "rgba(250,204,21,0.12)"
                        : "transparent",
                    })}
                  >
                    <Text
                      style={{
                        color: isEquipped
                          ? "#FACC15"
                          : CATEGORY_BORDER.tangibles,
                        fontWeight: "800",
                      }}
                    >
                      {isEquipped
                        ? "Unequip Companion"
                        : "Equip Companion"}
                    </Text>
                  </Pressable>
                </Card>
              );
            })}
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
