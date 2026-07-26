// app/components/FxOverlay.tsx

import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
  Text,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFx } from "../context/FxProvider";

let useThemeSafe: any = null;

try {
  useThemeSafe = require("../context/ThemeContext").useTheme;
} catch {
  // Theme fallback is handled below.
}

type Mode =
  | "neon"
  | "purpleNeon"
  | "glitter"
  | "stars"
  | "petals"
  | "snow"
  | "sparks"
  | "bubbles";

type Drop = {
  left: number;
  top: number;
  size: number;
  dur: number;
  rot: number;
  sway: number;
  phase: number;
  colorIndex: number;
};

const NEON_COLORS = [
  "#00E5FF",
  "#FF2BD6",
  "#8B5CFF",
  "#39FF88",
  "#FFE347",
  "#FF7A18",
];

const PURPLE_NEON_COLORS = [
  "#E879F9",
  "#C084FC",
  "#A855F7",
  "#8B5CF6",
  "#F0ABFC",
];

const GLITTER_COLORS = [
  "#FFFFFF",
  "#FFE7A8",
  "#FFD4F4",
  "#CDEEFF",
  "#DCCBFF",
  "#BFFFE1",
];

export default function FxOverlay() {
  const { enabled } = useFx();
  const dims = useWindowDimensions();

  const themeCtx = useThemeSafe
    ? (() => {
        try {
          return useThemeSafe();
        } catch {
          return null;
        }
      })()
    : null;

  /**
   * Your ThemeContext exposes themeId.
   * Supporting id and tokens.id keeps compatibility with older files.
   */
  const themeId: string =
    themeCtx?.themeId ||
    themeCtx?.id ||
    themeCtx?.tokens?.id ||
    "theme:neon";

  const tokens = themeCtx?.tokens || {};
  const accent = tokens.accent || "#00e5ff";

  const isDark =
    !!tokens?.isDark ||
    /black|midnight|dark|night/i.test(themeId);

  const mode: Mode =
    /glitter/i.test(themeId)
      ? "glitter"
      : /neon.?purple/i.test(themeId)
      ? "purpleNeon"
      : /starry/i.test(themeId)
      ? "stars"
      : /pink|rose|blush/i.test(themeId)
      ? "petals"
      : /silver|frost|ice|snow/i.test(themeId)
      ? "snow"
      : /black.?gold/i.test(themeId)
      ? "sparks"
      : /mint|emerald|teal/i.test(themeId)
      ? "bubbles"
      : "neon";

  const color =
    mode === "sparks"
      ? "#ffd166"
      : mode === "snow"
      ? isDark
        ? "#f6fbff"
        : "#bcd7ff"
      : mode === "petals"
      ? "#ff6fb6"
      : mode === "bubbles"
      ? "#7ce8d5"
      : mode === "stars"
      ? "#a2c8ff"
      : accent;

  const config = useMemo(() => {
    const base =
      Platform.OS === "web"
        ? 44
        : dims.width > 800
        ? 38
        : 26;

    switch (mode) {
      case "glitter":
        return {
          count: base + 12,
          durMin: 2200,
          durMax: 4800,
          rot: true,
          sway: 0,
          sizeMin: 8,
          sizeMax: 18,
          fadeSoft: true,
        };

      case "stars":
        return {
          count: base - 6,
          durMin: 4000,
          durMax: 6200,
          rot: true,
          sway: 8,
          sizeMin: 10,
          sizeMax: 22,
          fadeSoft: true,
        };

      case "petals":
        return {
          count: base - 5,
          durMin: 4200,
          durMax: 6600,
          rot: true,
          sway: 16,
          sizeMin: 12,
          sizeMax: 28,
          fadeSoft: true,
        };

      case "snow":
        return {
          count: base + 4,
          durMin: 5200,
          durMax: 7600,
          rot: false,
          sway: 12,
          sizeMin: 6,
          sizeMax: 14,
          fadeSoft: true,
        };

      case "sparks":
        return {
          count: base - 10,
          durMin: 2600,
          durMax: 3600,
          rot: true,
          sway: 3,
          sizeMin: 10,
          sizeMax: 18,
          fadeSoft: false,
        };

      case "bubbles":
        return {
          count: base - 2,
          durMin: 4800,
          durMax: 7200,
          rot: false,
          sway: 10,
          sizeMin: 10,
          sizeMax: 18,
          fadeSoft: true,
        };

      case "purpleNeon":
      case "neon":
      default:
        return {
          count: base,
          durMin: 3000,
          durMax: 4800,
          rot: false,
          sway: 0,
          sizeMin: 16,
          sizeMax: 32,
          fadeSoft: false,
        };
    }
  }, [mode, dims.width]);

  const drops = useMemo<Drop[]>(() => {
    const arr: Drop[] = [];

    for (let index = 0; index < config.count; index++) {
      const left = Math.random() * dims.width;
      const top = Math.random() * dims.height;

      const size =
        config.sizeMin +
        Math.random() * (config.sizeMax - config.sizeMin);

      const dur =
        config.durMin +
        Math.random() * (config.durMax - config.durMin);

      const rot = config.rot ? Math.random() * 360 : 0;

      const sway = config.sway
        ? Math.random() *
          config.sway *
          (Math.random() < 0.5 ? -1 : 1)
        : 0;

      arr.push({
        left,
        top,
        size,
        dur,
        rot,
        sway,
        phase: Math.random(),
        colorIndex: index,
      });
    }

    return arr;
  }, [
    Math.round(dims.width / 64),
    Math.round(dims.height / 64),
    config.count,
    config.sizeMin,
    config.sizeMax,
    config.durMin,
    config.durMax,
    config.rot,
    config.sway,
  ]);

  useEffect(() => {
    if (__DEV__) {
      console.log(
        "[FxOverlay] enabled =",
        enabled,
        "theme =",
        themeId,
        "mode =",
        mode
      );
    }
  }, [enabled, mode, themeId]);

  return (
    <View
      pointerEvents="none"
      style={[S.wrap, { opacity: enabled ? 1 : 0 }]}
    >
      {mode === "glitter" ? (
        <GlitterField
          width={dims.width}
          height={dims.height}
          drops={drops}
        />
      ) : (
        <Field
          height={dims.height}
          drops={drops}
          color={color}
          mode={mode}
          fadeSoft={config.fadeSoft}
        />
      )}
    </View>
  );
}

function GlitterField({
  width,
  height,
  drops,
}: {
  width: number;
  height: number;
  drops: Drop[];
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ShimmerSweep
        width={width}
        height={height}
        duration={6200}
        delay={0}
        opacity={0.16}
      />

      <ShimmerSweep
        width={width}
        height={height}
        duration={8200}
        delay={1800}
        opacity={0.1}
      />

      {drops.map((drop, index) => (
        <GlitterTwinkle
          key={`glitter-${index}`}
          cfg={drop}
          color={GLITTER_COLORS[index % GLITTER_COLORS.length]}
        />
      ))}
    </View>
  );
}

function ShimmerSweep({
  width,
  height,
  duration,
  delay,
  opacity,
}: {
  width: number;
  height: number;
  duration: number;
  delay: number;
  opacity: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration,
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
  }, [delay, duration, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.65, width * 1.25],
  });

  const sweepOpacity = progress.interpolate({
    inputRange: [0, 0.12, 0.5, 0.88, 1],
    outputRange: [0, opacity, opacity * 0.8, opacity, 0],
  });

  return (
    <Animated.View
      style={[
        S.shimmer,
        {
          height: height * 1.55,
          opacity: sweepOpacity,
          transform: [
            { translateX },
            { translateY: -height * 0.22 },
            { rotate: "-18deg" },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={[
          "rgba(255,255,255,0)",
          "rgba(255,235,196,0.72)",
          "rgba(235,215,255,0.72)",
          "rgba(200,240,255,0.76)",
          "rgba(206,255,229,0.62)",
          "rgba(255,255,255,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function GlitterTwinkle({
  cfg,
  color,
}: {
  cfg: Drop;
  color: string;
}) {
  const twinkle = useRef(
    new Animated.Value(cfg.phase)
  ).current;

  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const twinkleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, {
          toValue: 1,
          duration: Math.max(600, cfg.dur * 0.45),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(twinkle, {
          toValue: 0.08,
          duration: Math.max(700, cfg.dur * 0.55),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const driftAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: cfg.dur * 1.4,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: cfg.dur * 1.4,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    twinkleAnimation.start();
    driftAnimation.start();

    return () => {
      twinkleAnimation.stop();
      driftAnimation.stop();
      twinkle.stopAnimation();
      drift.stopAnimation();
    };
  }, [cfg.dur, drift, twinkle]);

  const opacity = twinkle.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0.08, 0.42, 1],
  });

  const scale = twinkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1.18],
  });

  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-3, 4],
  });

  const translateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-2, 3],
  });

  const symbol = cfg.colorIndex % 4 === 0 ? "✦" : "✧";

  return (
    <Animated.Text
      pointerEvents="none"
      style={{
        position: "absolute",
        left: cfg.left,
        top: cfg.top,
        color,
        fontSize: cfg.size,
        opacity,
        textShadowColor: color,
        textShadowRadius: 8,
        transform: [
          { translateX },
          { translateY },
          { rotate: `${cfg.rot}deg` },
          { scale },
        ],
      }}
    >
      {symbol}
    </Animated.Text>
  );
}

function Field({
  height,
  drops,
  color,
  mode,
  fadeSoft,
}: {
  height: number;
  drops: Drop[];
  color: string;
  mode: Exclude<Mode, "glitter">;
  fadeSoft: boolean;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((drop, index) => (
        <Faller
          key={`${mode}-${index}`}
          cfg={drop}
          height={height}
          color={color}
          mode={mode}
          fadeSoft={fadeSoft}
        />
      ))}
    </View>
  );
}

function Faller({
  cfg,
  height,
  color,
  mode,
  fadeSoft,
}: {
  cfg: Drop;
  height: number;
  color: string;
  mode: Exclude<Mode, "glitter">;
  fadeSoft: boolean;
}) {
  const fall = useRef(
    new Animated.Value(cfg.phase)
  ).current;

  const sway = useRef(
    new Animated.Value(cfg.phase)
  ).current;

  useEffect(() => {
    let mounted = true;

    const startFall = () => {
      const firstDuration = cfg.dur * (1 - cfg.phase);

      Animated.timing(fall, {
        toValue: 1,
        duration: Math.max(200, firstDuration),
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!mounted || !finished) return;

        const loop = () => {
          fall.setValue(0);

          Animated.timing(fall, {
            toValue: 1,
            duration: cfg.dur,
            easing: Easing.linear,
            useNativeDriver: true,
          }).start(({ finished: loopFinished }) => {
            if (mounted && loopFinished) loop();
          });
        };

        loop();
      });
    };

    const startSway = () => {
      if (!cfg.sway) return;

      const loopSway = () => {
        sway.setValue(0);

        Animated.timing(sway, {
          toValue: 1,
          duration: 1800 + Math.random() * 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (mounted && finished) loopSway();
        });
      };

      loopSway();
    };

    fall.setValue(cfg.phase);
    startFall();
    startSway();

    return () => {
      mounted = false;
      fall.stopAnimation();
      sway.stopAnimation();
    };
  }, [
    cfg.dur,
    cfg.phase,
    cfg.sway,
    fall,
    sway,
  ]);

  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [-cfg.size, height + cfg.size],
  });

  const translateX = sway.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, cfg.sway, 0],
  });

  const opacity = fadeSoft
    ? fall.interpolate({
        inputRange: [0, 0.08, 0.92, 1],
        outputRange: [0, 1, 1, 0],
      })
    : fall.interpolate({
        inputRange: [0, 0.04, 0.96, 1],
        outputRange: [0, 1, 1, 0],
      });

  if (mode === "neon" || mode === "purpleNeon") {
    const palette =
      mode === "purpleNeon"
        ? PURPLE_NEON_COLORS
        : NEON_COLORS;

    const neonColor =
      palette[cfg.colorIndex % palette.length];

    const length = cfg.size + 20;

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          S.item,
          {
            left: cfg.left,
            opacity,
            transform: [{ translateY }, { translateX }],
          },
        ]}
      >
        <View
          style={{
            width: 3,
            height: length,
            borderRadius: 3,
            backgroundColor: neonColor,
            shadowColor: neonColor,
            shadowOpacity: 0.9,
            shadowRadius: 10,
          }}
        />

        <View
          style={{
            position: "absolute",
            left: -2,
            bottom: -2,
            width: 7,
            height: 7,
            borderRadius: 999,
            backgroundColor: neonColor,
            shadowColor: neonColor,
            shadowOpacity: 1,
            shadowRadius: 9,
          }}
        />
      </Animated.View>
    );
  }

  const rotation = `${cfg.rot}deg`;

  if (mode === "stars") {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          S.item,
          {
            left: cfg.left,
            opacity,
            transform: [
              { translateY },
              { translateX },
              { rotate: rotation },
            ],
          },
        ]}
      >
        <Text
          style={{
            color,
            fontSize: 10 + cfg.size * 0.25,
            textShadowColor: color,
            textShadowRadius: 5,
          }}
        >
          ✦
        </Text>
      </Animated.View>
    );
  }

  if (mode === "petals") {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          S.item,
          {
            left: cfg.left,
            opacity,
            transform: [
              { translateY },
              { translateX },
              { rotate: rotation },
            ],
          },
        ]}
      >
        <Text
          style={{
            color,
            fontSize: 12 + cfg.size * 0.22,
          }}
        >
          ❀
        </Text>
      </Animated.View>
    );
  }

  if (mode === "snow") {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          S.item,
          {
            left: cfg.left,
            opacity,
            transform: [{ translateY }, { translateX }],
          },
        ]}
      >
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      </Animated.View>
    );
  }

  if (mode === "bubbles") {
    const radius = 3 + cfg.size * 0.12;

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          S.item,
          {
            left: cfg.left,
            opacity,
            transform: [{ translateY }, { translateX }],
          },
        ]}
      >
        <View
          style={{
            width: radius * 2,
            height: radius * 2,
            borderRadius: radius,
            borderWidth: 1.25,
            borderColor: color,
            backgroundColor: "transparent",
          }}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        S.item,
        {
          left: cfg.left,
          opacity,
          transform: [
            { translateY },
            { translateX },
            { rotate: rotation },
          ],
        },
      ]}
    >
      <Text
        style={{
          color,
          fontSize: 10 + cfg.size * 0.2,
        }}
      >
        ✧
      </Text>
    </Animated.View>
  );
}

const S = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 9998,
  },
  item: {
    position: "absolute",
    top: 0,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    width: 150,
  },
});