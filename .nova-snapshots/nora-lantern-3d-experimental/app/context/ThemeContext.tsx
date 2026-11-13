// app/context/ThemeContext.tsx

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useUser } from "./UserContext";
import { usePurchases } from "./PurchasesContext";

export type ProviderThemeId =
  | "theme:default"
  | "theme:neon"
  | "theme:starry"
  | "theme:pink"
  | "theme:dark"
  | "theme:mint"
  | "theme:glitter"
  | "theme:blackgold"
  | "theme:neonpurple"
  | "theme:silver"
  | "theme:emerald"
  | "theme:crimson";

export type Tokens = {
  id: ProviderThemeId;
  name: string;
  isDark: boolean;

  bg: string;
  text: string;

  card: string;
  cardText: string;

  border: string;
  accent: string;

  gradient: [string, string];
  barStyle:
    | "light-content"
    | "dark-content";

  titleText: string;

  pillBg: string;
  pillText: string;
  pillBorder: string;

  softShadow: string;
};

const THEME_KEY_BASE = "@nova/themeId";

const themeStorageKey = (
  uid: string | null
) =>
  uid
    ? `${THEME_KEY_BASE}.user.${uid}`
    : `${THEME_KEY_BASE}.guest`;

/**
 * Classic Nova is the true free/base theme.
 *
 * Dark Nova, Neon Nova, and every other shop theme remain paid themes.
 * The splash screen owns its separate fixed black presentation and does not
 * participate in theme selection.
 */
const DEFAULT_THEME: ProviderThemeId =
  "theme:default";

const canonMap: Record<
  string,
  ProviderThemeId
> = {
  "theme:default": "theme:default",
  "theme:free": "theme:default",
  "theme:classic": "theme:default",
  default: "theme:default",
  free: "theme:default",
  classic: "theme:default",

  "theme:neon": "theme:neon",

  "theme:starry": "theme:starry",
  "theme:starry-night": "theme:starry",
  theme_starry: "theme:starry",
  starry_night: "theme:starry",

  "theme:pink": "theme:pink",
  "theme:dark": "theme:dark",
  "theme:mint": "theme:mint",
  "theme:glitter": "theme:glitter",

  "theme:blackgold": "theme:blackgold",
  "theme:black_gold":
    "theme:blackgold",

  "theme:neonpurple":
    "theme:neonpurple",
  "theme:neon_purple":
    "theme:neonpurple",

  "theme:silver": "theme:silver",
  "theme:silver_frost":
    "theme:silver",

  "theme:emerald": "theme:emerald",
  "theme:emerald-wave":
    "theme:emerald",
  "theme:emerald_wave":
    "theme:emerald",

  "theme:crimson": "theme:crimson",
  "theme:crimson-dream":
    "theme:crimson",
  "theme:crimson_dream":
    "theme:crimson",
};

function canonId(
  id?: string | null
): ProviderThemeId {
  const raw = (
    id ?? DEFAULT_THEME
  )
    .trim()
    .toLowerCase();

  if (canonMap[raw]) {
    return canonMap[raw];
  }

  if (!raw.includes(":")) {
    const prefixed = `theme:${raw}`;

    if (canonMap[prefixed]) {
      return canonMap[prefixed];
    }
  }

  return DEFAULT_THEME;
}

function withReadability(
  theme: Omit<
    Tokens,
    | "titleText"
    | "pillBg"
    | "pillText"
    | "pillBorder"
    | "softShadow"
  > &
    Partial<
      Pick<
        Tokens,
        | "titleText"
        | "pillBg"
        | "pillText"
        | "pillBorder"
        | "softShadow"
      >
    >
): Tokens {
  const isDark = !!theme.isDark;

  const titleText =
    theme.titleText ?? theme.text;

  const pillText =
    theme.pillText ?? theme.text;

  const pillBg =
    theme.pillBg ??
    (isDark
      ? "rgba(232,245,255,0.10)"
      : "rgba(13,27,42,0.08)");

  const pillBorder =
    theme.pillBorder ??
    (isDark
      ? "rgba(232,245,255,0.18)"
      : "rgba(13,27,42,0.20)");

  const softShadow =
    theme.softShadow ??
    (isDark
      ? "rgba(0,0,0,0.0)"
      : "rgba(0,0,0,0.18)");

  return {
    ...theme,
    titleText,
    pillBg,
    pillText,
    pillBorder,
    softShadow,
  } as Tokens;
}

export const THEMES: Record<
  ProviderThemeId,
  Tokens
> = {
  "theme:default": withReadability({
    id: "theme:default",
    name: "Classic Nova",
    isDark: true,
    bg: "#03070D",
    text: "#F1F5F9",
    card: "#0B1420",
    cardText: "#CBD5E1",
    border: "#26384D",
    accent: "#38BDF8",
    gradient: [
      "#07111D",
      "#020407",
    ],
    barStyle: "light-content",
    pillBg:
      "rgba(56,189,248,0.09)",
    pillBorder:
      "rgba(56,189,248,0.22)",
  }),

  "theme:neon": withReadability({
    id: "theme:neon",
    name: "Neon Nova",
    isDark: true,
    bg: "#05060A",
    text: "#E8F5FF",
    card: "#0B1020",
    cardText: "#E8F5FF",
    border: "#1EE3FF",
    accent: "#00C8FF",
    gradient: [
      "#00E5FF",
      "#00121A",
    ],
    barStyle: "light-content",
    pillBg:
      "rgba(0,229,255,0.12)",
    pillBorder:
      "rgba(30,227,255,0.35)",
  }),

  "theme:starry": withReadability({
    id: "theme:starry",
    name: "Starry Night",
    isDark: true,
    bg: "#0A0C18",
    text: "#E6EDFF",
    card: "#11162B",
    cardText: "#E6EDFF",
    border: "#6BA7FF",
    accent: "#3D7EFF",
    gradient: [
      "#1E3A8A",
      "#0B1020",
    ],
    barStyle: "light-content",
    pillBg:
      "rgba(230,237,255,0.10)",
    pillBorder:
      "rgba(107,167,255,0.28)",
  }),

  "theme:pink": withReadability({
    id: "theme:pink",
    name: "Pink Dawn",
    isDark: false,
    bg: "#FFF5F8",
    text: "#2A0F18",
    card: "#FFE6EF",
    cardText: "#2A0F18",
    border: "#FF87B0",
    accent: "#FF4FA0",
    gradient: [
      "#FFD1E1",
      "#FFFFFF",
    ],
    barStyle: "dark-content",
    titleText: "#1D0A12",
    pillBg:
      "rgba(42,15,24,0.10)",
    pillText: "#1D0A12",
    pillBorder:
      "rgba(42,15,24,0.22)",
    softShadow:
      "rgba(0,0,0,0.18)",
  }),

  "theme:dark": withReadability({
    id: "theme:dark",
    name: "Dark Nova",
    isDark: true,
    bg: "#000000",
    text: "#EDEDED",
    card: "#101010",
    cardText: "#EDEDED",
    border: "#444444",
    accent: "#00C8FF",
    gradient: [
      "#050505",
      "#000000",
    ],
    barStyle: "light-content",
    pillBg:
      "rgba(255,255,255,0.08)",
    pillBorder:
      "rgba(255,255,255,0.16)",
  }),

  "theme:mint": withReadability({
    id: "theme:mint",
    name: "Mint Breeze",
    isDark: false,
    bg: "#F3FFFB",
    text: "#06231B",
    card: "#E3FBF3",
    cardText: "#06231B",
    border: "#9EF6D0",
    accent: "#3ED3A2",
    gradient: [
      "#C9FFE9",
      "#FFFFFF",
    ],
    barStyle: "dark-content",
    titleText: "#041A14",
    pillBg:
      "rgba(6,35,27,0.10)",
    pillText: "#041A14",
    pillBorder:
      "rgba(6,35,27,0.22)",
    softShadow:
      "rgba(0,0,0,0.18)",
  }),

  "theme:glitter": withReadability({
    id: "theme:glitter",
    name: "Glitter",
    isDark: true,
    bg: "#0E0A12",
    text: "#FFF6FF",
    card: "#1A1320",
    cardText: "#FFF6FF",
    border: "#FFB7FF",
    accent: "#F06BFF",
    gradient: [
      "#3B0B45",
      "#0E0A12",
    ],
    barStyle: "light-content",
    pillBg:
      "rgba(255,246,255,0.10)",
    pillBorder:
      "rgba(255,183,255,0.25)",
  }),

  "theme:blackgold": withReadability({
    id: "theme:blackgold",
    name: "Black & Gold",
    isDark: true,
    bg: "#0B0900",
    text: "#FFF9E6",
    card: "#171203",
    cardText: "#FFF9E6",
    border: "#E6B800",
    accent: "#F2C200",
    gradient: [
      "#2B2100",
      "#0B0900",
    ],
    barStyle: "light-content",
    pillBg:
      "rgba(242,194,0,0.10)",
    pillBorder:
      "rgba(230,184,0,0.30)",
    pillText: "#FFF9E6",
  }),

  "theme:neonpurple": withReadability({
    id: "theme:neonpurple",
    name: "Neon Purple",
    isDark: true,
    bg: "#0A0610",
    text: "#F3E8FF",
    card: "#150A24",
    cardText: "#F3E8FF",
    border: "#C084FC",
    accent: "#A855F7",
    gradient: [
      "#3B1A6D",
      "#0A0610",
    ],
    barStyle: "light-content",
    pillBg:
      "rgba(192,132,252,0.10)",
    pillBorder:
      "rgba(192,132,252,0.26)",
  }),

  "theme:silver": withReadability({
    id: "theme:silver",
    name: "Silver Frost",
    isDark: false,
    bg: "#F6F8FB",
    text: "#0D1B2A",
    card: "#E9EEF5",
    cardText: "#0D1B2A",
    border: "#A7B7C9",
    accent: "#5C7A99",
    gradient: [
      "#FFFFFF",
      "#E9EEF5",
    ],
    barStyle: "dark-content",
    titleText: "#0B1220",
    pillBg:
      "rgba(13,27,42,0.08)",
    pillText: "#0B1220",
    pillBorder:
      "rgba(13,27,42,0.20)",
    softShadow:
      "rgba(0,0,0,0.18)",
  }),

  "theme:emerald": withReadability({
    id: "theme:emerald",
    name: "Emerald Wave",
    isDark: true,
    bg: "#03120E",
    text: "#E8FFF6",
    card: "#0A241E",
    cardText: "#E8FFF6",
    border: "#00E6A8",
    accent: "#00C28A",
    gradient: [
      "#046C54",
      "#03120E",
    ],
    barStyle: "light-content",
    pillBg:
      "rgba(0,230,168,0.10)",
    pillBorder:
      "rgba(0,230,168,0.28)",
  }),

  "theme:crimson": withReadability({
    id: "theme:crimson",
    name: "Crimson Dream",
    isDark: true,
    bg: "#180607",
    text: "#FFE8EA",
    card: "#2B0B0D",
    cardText: "#FFE8EA",
    border: "#FF848F",
    accent: "#FF5162",
    gradient: [
      "#7A1320",
      "#180607",
    ],
    barStyle: "light-content",
    pillBg:
      "rgba(255,132,143,0.10)",
    pillBorder:
      "rgba(255,132,143,0.26)",
  }),
};

let themeTokensSnapshot:
  | Tokens
  | null = null;

export function getTokensSnapshot(): Tokens {
  return (
    themeTokensSnapshot ??
    THEMES[DEFAULT_THEME]
  );
}

type ThemeContextValue = {
  themeId: ProviderThemeId;
  tokens: Tokens;
  setThemeById: (
    id: string | null | undefined
  ) => void;
};

const ThemeCtx =
  createContext<ThemeContextValue | null>(
    null
  );

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabaseUserId } = useUser();

  const purchaseContext =
    usePurchases() as any;

  const purchases =
    purchaseContext?.purchases ?? {};

  const purchasesReady =
    typeof purchaseContext?.purchasesReady ===
    "boolean"
      ? purchaseContext.purchasesReady
      : true;

  const [themeId, setThemeId] =
    useState<ProviderThemeId>(
      DEFAULT_THEME
    );

  const ownedThemes = useMemo(() => {
    const owned =
      new Set<ProviderThemeId>();

    if (
      purchases &&
      typeof purchases === "object"
    ) {
      for (const sku of Object.keys(
        purchases
      )) {
        if (
          !sku.startsWith("theme:")
        ) {
          continue;
        }

        const canonical =
          canonId(sku);

        if (
          canonical !== DEFAULT_THEME
        ) {
          owned.add(canonical);
        }
      }
    }

    // Classic Nova is always free. No paid theme is automatically owned.
    owned.add(DEFAULT_THEME);

    return owned;
  }, [purchases]);

  const ensureOwned = useCallback(
    (
      id: ProviderThemeId
    ): ProviderThemeId => {
      return ownedThemes.has(id)
        ? id
        : DEFAULT_THEME;
    },
    [ownedThemes]
  );

  useEffect(() => {
    if (!purchasesReady) {
      return;
    }

    let alive = true;

    void (async () => {
      try {
        const key =
          themeStorageKey(
            supabaseUserId ?? null
          );

        const saved =
          await AsyncStorage.getItem(
            key
          );

        const canonical =
          canonId(saved);

        const next =
          ensureOwned(canonical);

        if (!alive) return;

        /*
         * Do not rewrite storage during hydration.
         *
         * Earlier code could load before purchases were ready, decide the
         * equipped theme was unavailable, and permanently overwrite it with
         * the fallback. Storage is written only when the user explicitly
         * equips a theme.
         */
        setThemeId(next);
      } catch (error) {
        console.warn(
          "[ThemeContext] load theme error:",
          error
        );

        if (alive) {
          setThemeId(DEFAULT_THEME);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    supabaseUserId,
    purchasesReady,
    ensureOwned,
  ]);

  const setThemeById = useCallback(
    (
      id:
        | string
        | null
        | undefined
    ) => {
      const safe =
        ensureOwned(
          canonId(id)
        );

      setThemeId(safe);

      const key =
        themeStorageKey(
          supabaseUserId ?? null
        );

      void AsyncStorage.setItem(
        key,
        safe
      ).catch((error) => {
        console.warn(
          "[ThemeContext] save theme error:",
          error
        );
      });
    },
    [
      supabaseUserId,
      ensureOwned,
    ]
  );

  const tokens = useMemo(
    () =>
      THEMES[themeId] ??
      THEMES[DEFAULT_THEME],
    [themeId]
  );

  useEffect(() => {
    themeTokensSnapshot = tokens;
  }, [tokens]);

  const value =
    useMemo<ThemeContextValue>(
      () => ({
        themeId,
        tokens,
        setThemeById,
      }),
      [
        themeId,
        tokens,
        setThemeById,
      ]
    );

  return (
    <ThemeCtx.Provider value={value}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const value =
    useContext(ThemeCtx);

  if (!value) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return value;
}