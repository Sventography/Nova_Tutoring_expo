// app/components/ThemeOverlay.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

let useThemeSafe: any = null;

try {
  useThemeSafe = require("../context/ThemeContext").useTheme;
} catch {
  // The fallback below is used if ThemeContext is not ready.
}

/**
 * Theme-specific page gradients.
 *
 * Neon Nova:
 * - vivid cyan, pink, violet, and deep-blue foundation
 *
 * Glitter:
 * - neutral dark iridescent foundation
 * - animated soft shimmer sweep
 *
 * The visible particles themselves are handled by FxOverlay.tsx.
 */
function colorsFor(themeId: string, accent?: string): string[] {
  const id = String(themeId || "").trim().toLowerCase();

  if (/glitter/i.test(id)) {
    return ["#07080d", "#15121a", "#0b1016", "#120f16"];
  }

  if (/neon.?purple/i.test(id)) {
    return ["#08030f", "#18072d", "#2c0c4c", "#0d0617"];
  }

  if (/theme:neon$|^neon$/i.test(id)) {
    return ["#01040b", "#071a32", "#25083d", "#00343b"];
  }

  if (/starry/i.test(id)) {
    return ["#0a0f2d", "#0b1645", "#0f225f"];
  }

  if (/pink|rose|blush/i.test(id)) {
    return ["#2b0a1d", "#3b0f2b", "#5d1844"];
  }

  if (/silver|frost|ice|snow/i.test(id)) {
    return ["#0a0f12", "#0e1820", "#0f1f2a"];
  }

  if (/black.?gold/i.test(id)) {
    return ["#0a0a0a", "#101010", "#17130a"];
  }

  if (/mint|emerald|teal/i.test(id)) {
    return ["#061613", "#09211c", "#0b2b24"];
  }

  if (/crimson/i.test(id)) {
    return ["#170507", "#310a10", "#510f1b"];
  }

  if (/dark/i.test(id)) {
    return ["#020202", "#090909", "#000000"];
  }

  return ["#030a0d", accent || "#06131a", "#0a1e28"];
}

const START = { x: 0.1, y: 0.0 };
const END = { x: 1.0, y: 1.0 };

function ThemeOverlayInner() {
  const useTheme =
    useThemeSafe ||
    (() => ({
      themeId: "theme:neon",
      tokens: { accent: "#00e5ff" },
    }));

  const theme = useTheme() || {};

  /**
   * Your ThemeContext exposes themeId, while some older files looked for id.
   * Supporting both prevents every theme from silently falling back to default.
   */
  const themeId: string =
    theme.themeId ??
    theme.id ??
    theme.tokens?.id ??
    "theme:neon";

  const tokens: any = theme.tokens ?? { accent: "#00e5ff" };
  const accent = tokens?.accent as string | undefined;

  // Double-buffered crossfade between theme backgrounds.
  const [prevId, setPrevId] = useState(themeId);
  const [currId, setCurrId] = useState(themeId);
  const fade = useRef(new Animated.Value(1)).current;

  // Glitter-only page shimmer.
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (themeId === currId) return;

    setPrevId(currId);
    setCurrId(themeId);

    fade.setValue(0);

    Animated.timing(fade, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [themeId, currId, fade]);

  const glitterActive = /glitter/i.test(currId);

  useEffect(() => {
    shimmer.stopAnimation();
    shimmer.setValue(0);

    if (!glitterActive) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
      shimmer.stopAnimation();
    };
  }, [glitterActive, shimmer]);

  const prevColors = useMemo(
    () => colorsFor(prevId, accent),
    [prevId, accent]
  );

  const currColors = useMemo(
    () => colorsFor(currId, accent),
    [currId, accent]
  );

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-460, 760],
  });

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 0.42, 0.58, 1],
    outputRange: [0, 0.11, 0.2, 0],
  });

  return (
    <View pointerEvents="none" style={S.wrap}>
      {/* Previous theme frame, fading out. */}
      <Animated.View
        style={[
          S.layer,
          {
            opacity: fade.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      >
        <LinearGradient
          colors={prevColors}
          start={START}
          end={END}
          style={S.fill}
        />
      </Animated.View>

      {/* Current theme frame, fading in. */}
      <Animated.View style={[S.layer, { opacity: fade }]}>
        <LinearGradient
          colors={currColors}
          start={START}
          end={END}
          style={S.fill}
        />

        {glitterActive ? (
          <>
            {/* Soft iridescent surface tint. */}
            <LinearGradient
              colors={[
                "rgba(255,255,255,0.025)",
                "rgba(255,220,245,0.05)",
                "rgba(205,238,255,0.04)",
                "rgba(210,255,232,0.025)",
                "rgba(255,255,255,0.015)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={S.glitterTint}
            />

            {/* A slow glint that travels across the page. */}
            <Animated.View
              style={[
                S.shimmerSweep,
                {
                  opacity: shimmerOpacity,
                  transform: [
                    { translateX: shimmerTranslate },
                    { rotate: "-18deg" },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(255,255,255,0)",
                  "rgba(255,232,190,0.72)",
                  "rgba(231,211,255,0.58)",
                  "rgba(195,238,255,0.68)",
                  "rgba(206,255,229,0.56)",
                  "rgba(255,255,255,0)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={S.fill}
              />
            </Animated.View>
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}

export default React.memo(ThemeOverlayInner);

const S = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: -1,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  glitterTint: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmerSweep: {
    position: "absolute",
    top: -180,
    bottom: -180,
    left: -180,
    width: 180,
  },
});