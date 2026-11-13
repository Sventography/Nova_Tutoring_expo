// app/components/AchievementConfettiOverlay.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AchieveEmitter } from "../context/AchievementsContext";

type BannerState = {
  id: string;
  message: string;
};

export default function AchievementConfettiOverlay() {
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [visible, setVisible] = useState(false);

  const anim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sub = AchieveEmitter.addListener("celebrate", (payload: any) => {
      try {
        let message: string | null = null;

        if (typeof payload === "string") {
          message = payload;
        } else if (payload && typeof payload === "object") {
          if (typeof payload.message === "string") {
            message = payload.message;
          } else if (typeof payload.title === "string") {
            const coins =
              typeof payload.coins === "number" && payload.coins > 0
                ? ` — +${payload.coins.toLocaleString()} coins`
                : "";
            message = `${payload.title}${coins}`;
          }
        }

        if (!message) return;

        const nextBanner: BannerState = {
          id: `ach-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          message,
        };

        setBanner(nextBanner);
        setVisible(true);

        anim.setValue(0);
        confettiAnim.setValue(0);

        Animated.timing(anim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();

        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();

        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
          Animated.timing(anim, {
            toValue: 0,
            duration: 220,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: false,
          }).start(() => {
            setVisible(false);
            setBanner(null);
          });
        }, 2200);
      } catch (err) {
        console.warn(
          "[AchievementConfettiOverlay] celebrate handler error",
          err
        );
      }
    });

    return () => {
      try {
        sub.remove();
      } catch {}
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [anim, confettiAnim]);

  if (!visible || !banner) return null;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });
  const opacity = anim;

  const confetti = ["🎉", "🎊", "✨", "💫", "🎉", "🎊", "⭐", "🎉"];

  return (
    <View pointerEvents="none" style={styles.root}>
      <View pointerEvents="none" style={styles.confettiLayer}>
        {confetti.map((icon, idx) => {
          const offsetX = (idx - confetti.length / 2) * 24;
          const startY = 0;
          const endY = -80 - (idx % 3) * 24;

          const cy = confettiAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [startY, endY],
          });

          const cx = confettiAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, offsetX],
          });

          const rot = confettiAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ["-40deg", "40deg"],
          });

          const cop = confettiAnim.interpolate({
            inputRange: [0, 0.2, 0.9, 1],
            outputRange: [0, 1, 1, 0],
          });

          return (
            <Animated.Text
              key={`${icon}-${idx}-${banner.id}`}
              style={[
                styles.confettiPiece,
                {
                  opacity: cop,
                  transform: [
                    { translateY: cy },
                    { translateX: cx },
                    { rotate: rot },
                  ],
                },
              ]}
            >
              {icon}
            </Animated.Text>
          );
        })}
      </View>

      <Animated.View
        style={[
          styles.banner,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.glow} />
        <LinearGradient
          colors={["#00101c", "#000814"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Text style={styles.heading}>Achievement Unlocked</Text>
          <Text style={styles.title} numberOfLines={3}>
            {banner.message}
          </Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 96 : 84,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
  },
  banner: {
    maxWidth: 360,
    width: "86%",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  glow: {
    position: "absolute",
    left: 4,
    right: 4,
    top: -4,
    bottom: 4,
    borderRadius: 20,
    backgroundColor: "rgba(0,229,255,0.25)",
    borderWidth: 2,
    borderColor: "#00e5ff",
  },
  gradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#e6faff",
    opacity: 0.9,
  },
  title: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  confettiLayer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  confettiPiece: {
    position: "absolute",
    fontSize: 20,
  },
});