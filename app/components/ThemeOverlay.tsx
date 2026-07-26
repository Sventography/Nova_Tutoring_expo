// app/components/ThemeOverlay.tsx

import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../context/ThemeContext";
import { useFx } from "../context/FxProvider";

const NEON_COLORS = [
  "#00F5FF", // cyan
  "#FF2BD6", // hot pink
  "#8B5CFF", // electric violet
  "#39FF88", // neon green
  "#FFE94A", // electric yellow
  "#FF5A36", // neon orange
];

type DropConfig = {
  id: number;
  leftRatio: number;
  width: number;
  height: number;
  duration: number;
  delay: number;
  drift: number;
  color: string;
  opacity: number;
};

type WavePalette = {
  colors: string[];
  opacity: number;
  duration: number;
};

function normalizeThemeId(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, ":")
    .replace(/-/g, ":")
    .replace(/:+/g, ":");
}

function isNeonNovaTheme(value: unknown): boolean {
  const id = normalizeThemeId(value);

  return id === "neon" || id === "theme:neon";
}

function isGlitterTheme(value: unknown): boolean {
  const id = normalizeThemeId(value);
  return id === "glitter" || id === "theme:glitter";
}

/**
 * Every equipped theme except Glitter receives a clearly visible,
 * theme-colored shimmer wave. Glitter keeps its richer shimmer in
 * FxOverlay.tsx so the two systems do not stack on top of each other.
 */
function wavePaletteFor(
  themeId: unknown,
  accent?: string
): WavePalette {
  const id = normalizeThemeId(themeId);

  if (id === "theme:starry" || id === "starry") {
    return {
      colors: [
        "rgba(255,255,255,0)",
        "rgba(162,200,255,0.64)",
        "rgba(89,126,255,0.52)",
        "rgba(228,237,255,0.66)",
        "rgba(255,255,255,0)",
      ],
      opacity: 0.34,
      duration: 6100,
    };
  }

  if (id === "theme:pink" || id === "pink") {
    return {
      colors: [
        "rgba(255,255,255,0)",
        "rgba(255,79,160,0.52)",
        "rgba(255,183,218,0.70)",
        "rgba(255,255,255,0.76)",
        "rgba(255,255,255,0)",
      ],
      opacity: 0.34,
      duration: 6400,
    };
  }

  if (id === "theme:dark" || id === "dark") {
    return {
      colors: [
        "rgba(255,255,255,0)",
        "rgba(255,255,255,0.64)",
        "rgba(156,163,175,0.56)",
        "rgba(226,232,240,0.68)",
        "rgba(255,255,255,0)",
      ],
      opacity: 0.38,
      duration: 5900,
    };
  }

  if (id === "theme:mint" || id === "mint") {
    return {
      colors: [
        "rgba(255,255,255,0)",
        "rgba(62,211,162,0.54)",
        "rgba(158,246,208,0.70)",
        "rgba(255,255,255,0.74)",
        "rgba(255,255,255,0)",
      ],
      opacity: 0.34,
      duration: 6500,
    };
  }

  if (
    id === "theme:blackgold" ||
    id === "theme:black:gold" ||
    id === "blackgold"
  ) {
    return {
      colors: [
        "rgba(255,255,255,0)",
        "rgba(242,194,0,0.58)",
        "rgba(255,232,143,0.74)",
        "rgba(255,249,230,0.64)",
        "rgba(255,255,255,0)",
      ],
      opacity: 0.36,
      duration: 6000,
    };
  }

  if (
    id === "theme:neonpurple" ||
    id === "theme:neon:purple" ||
    id === "neonpurple"
  ) {
    return {
      colors: [
        "rgba(255,255,255,0)",
        "rgba(192,132,252,0.62)",
        "rgba(168,85,247,0.70)",
        "rgba(240,171,252,0.64)",
        "rgba(255,255,255,0)",
      ],
      opacity: 0.37,
      duration: 5800,
    };
  }

  if (id === "theme:silver" || id === "silver") {
    return {
      colors: [
        "rgba(255,255,255,0)",
        "rgba(92,122,153,0.48)",
        "rgba(199,216,235,0.72)",
        "rgba(255,255,255,0.86)",
        "rgba(255,255,255,0)",
      ],
      opacity: 0.35,
      duration: 6200,
    };
  }

  if (id === "theme:emerald" || id === "emerald") {
    return {
      colors: [
        "rgba(255,255,255,0)",
        "rgba(0,194,138,0.56)",
        "rgba(0,230,168,0.72)",
        "rgba(184,255,228,0.62)",
        "rgba(255,255,255,0)",
      ],
      opacity: 0.36,
      duration: 6000,
    };
  }

  if (id === "theme:crimson" || id === "crimson") {
    return {
      colors: [
        "rgba(255,255,255,0)",
        "rgba(255,81,98,0.58)",
        "rgba(255,132,143,0.70)",
        "rgba(255,222,226,0.62)",
        "rgba(255,255,255,0)",
      ],
      opacity: 0.36,
      duration: 6100,
    };
  }

  // Neon Nova and any future theme fallback.
  return {
    colors: [
      "rgba(255,255,255,0)",
      "rgba(0,245,255,0.62)",
      "rgba(255,43,214,0.58)",
      "rgba(139,92,255,0.58)",
      "rgba(57,255,136,0.50)",
      "rgba(255,255,255,0)",
    ],
    opacity: accent ? 0.35 : 0.34,
    duration: 5700,
  };
}

function ThemeShimmerWave({
  width,
  height,
  palette,
  delay,
  widthMultiplier = 0.42,
}: {
  width: number;
  height: number;
  palette: WavePalette;
  delay: number;
  widthMultiplier?: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: palette.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
      progress.stopAnimation();
    };
  }, [delay, palette.duration, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.8, width * 1.35],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.28, 0.72, 0.92, 1],
    outputRange: [
      0,
      palette.opacity * 0.55,
      palette.opacity,
      palette.opacity,
      palette.opacity * 0.55,
      0,
    ],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shimmerWave,
        {
          width: Math.max(150, width * widthMultiplier),
          height: height * 1.55,
          opacity,
          transform: [
            { translateX },
            { translateY: -height * 0.24 },
            { rotate: "-18deg" },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={palette.colors}
        locations={
          palette.colors.length === 6
            ? [0, 0.18, 0.39, 0.61, 0.82, 1]
            : [0, 0.23, 0.5, 0.77, 1]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function NeonDrop({
  config,
  width,
  height,
}: {
  config: DropConfig;
  width: number;
  height: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: config.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    progress.setValue(0);
    animation.start();

    return () => {
      animation.stop();
      progress.stopAnimation();
    };
  }, [config.delay, config.duration, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      -config.height - 80,
      height + config.height + 80,
    ],
  });

  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, config.drift, 0],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.06, 0.82, 1],
    outputRange: [0, config.opacity, config.opacity, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.dropWrap,
        {
          left:
            config.leftRatio *
            Math.max(1, width - 20),
          opacity,
          transform: [
            { translateY },
            { translateX },
          ],
        },
      ]}
    >
      <View
        style={{
          width: config.width,
          height: config.height,
          borderRadius: 999,
          backgroundColor: config.color,
          shadowColor: config.color,
          shadowOpacity:
            Platform.OS === "ios" ? 0.95 : 0,
          shadowRadius: 10,
          shadowOffset: {
            width: 0,
            height: 0,
          },
          elevation:
            Platform.OS === "android" ? 4 : 0,
        }}
      />

      <View
        style={{
          position: "absolute",
          top: -6,
          left: -(5 - config.width / 2),
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: config.color,
          opacity: 0.9,
          shadowColor: config.color,
          shadowOpacity:
            Platform.OS === "ios" ? 1 : 0,
          shadowRadius: 8,
          shadowOffset: {
            width: 0,
            height: 0,
          },
        }}
      />
    </Animated.View>
  );
}

export default function ThemeOverlay() {
  const theme = useTheme() as any;
  const { enabled: fxEnabled } = useFx();
  const { width, height } =
    useWindowDimensions();

  const themeId =
    theme?.themeId ??
    theme?.id ??
    theme?.tokens?.id ??
    theme?.theme ??
    "";

  const accent =
    theme?.tokens?.accent ?? "#00F5FF";

  const neonNovaActive =
    isNeonNovaTheme(themeId);

  const glitterActive =
    isGlitterTheme(themeId);

  const wavePalette = useMemo(
    () => wavePaletteFor(themeId, accent),
    [themeId, accent]
  );

  const drops = useMemo<DropConfig[]>(() => {
    const count = width >= 768 ? 34 : 24;

    return Array.from(
      { length: count },
      (_, index) => {
        const lane =
          (index * 47) % count;

        const color =
          NEON_COLORS[
            index % NEON_COLORS.length
          ];

        return {
          id: index,
          leftRatio:
            (lane + 0.5) / count,
          width: 2 + (index % 3),
          height:
            24 + ((index * 13) % 42),
          duration:
            2600 +
            ((index * 317) % 2500),
          delay:
            (index * 263) % 2300,
          drift:
            ((index % 5) - 2) * 8,
          color,
          opacity:
            0.55 +
            (index % 4) * 0.1,
        };
      }
    );
  }, [Math.round(width / 80)]);

  return (
    <View
      pointerEvents="none"
      style={styles.overlay}
    >
      {/*
       * Glitter already owns its richer shimmer in FxOverlay.
       * Every other active theme receives two softer sideways waves.
       * These waves do not depend on the FX switch.
       */}
      {!glitterActive ? (
        <>
          <ThemeShimmerWave
            width={width}
            height={height}
            palette={wavePalette}
            delay={0}
            widthMultiplier={0.46}
          />

          <ThemeShimmerWave
            width={width}
            height={height}
            palette={{
              ...wavePalette,
              opacity:
                wavePalette.opacity * 0.62,
              duration:
                wavePalette.duration + 1600,
            }}
            delay={2400}
            widthMultiplier={0.28}
          />
        </>
      ) : null}

      {neonNovaActive ? (
        <>
          {/* Strong, unmistakably neon color treatment. */}
          <LinearGradient
            colors={[
              "rgba(0,245,255,0.17)",
              "rgba(7,8,28,0.03)",
              "rgba(255,43,214,0.14)",
              "rgba(139,92,255,0.12)",
            ]}
            locations={[
              0,
              0.38,
              0.72,
              1,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={
              StyleSheet.absoluteFill
            }
          />

          <View
            style={[
              styles.glow,
              styles.cyanGlow,
            ]}
          />

          <View
            style={[
              styles.glow,
              styles.pinkGlow,
            ]}
          />

          <View
            style={[
              styles.glow,
              styles.violetGlow,
            ]}
          />

          <View
            style={[
              styles.glow,
              styles.greenGlow,
            ]}
          />

          <LinearGradient
            colors={[
              "rgba(0,245,255,0)",
              "rgba(0,245,255,0.92)",
              "rgba(255,43,214,0.92)",
              "rgba(57,255,136,0.82)",
              "rgba(0,245,255,0)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={
              styles.topNeonLine
            }
          />

          <LinearGradient
            colors={[
              "rgba(255,43,214,0)",
              "rgba(255,43,214,0.78)",
              "rgba(139,92,255,0.86)",
              "rgba(0,245,255,0.8)",
              "rgba(0,245,255,0)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={
              styles.bottomNeonLine
            }
          />

          {fxEnabled
            ? drops.map((config) => (
                <NeonDrop
                  key={config.id}
                  config={config}
                  width={width}
                  height={height}
                />
              ))
            : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
    overflow: "hidden",
  },
  shimmerWave: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  cyanGlow: {
    left: -135,
    top: 30,
    backgroundColor:
      "rgba(0,245,255,0.16)",
  },
  pinkGlow: {
    right: -150,
    top: 170,
    backgroundColor:
      "rgba(255,43,214,0.15)",
  },
  violetGlow: {
    left: "25%",
    bottom: -170,
    backgroundColor:
      "rgba(139,92,255,0.16)",
  },
  greenGlow: {
    right: -180,
    bottom: 80,
    backgroundColor:
      "rgba(57,255,136,0.09)",
  },
  topNeonLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 3,
  },
  bottomNeonLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  dropWrap: {
    position: "absolute",
    top: 0,
    alignItems: "center",
  },
});