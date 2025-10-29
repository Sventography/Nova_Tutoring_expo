import React from "react";
import { Animated, View, Text } from "react-native";
import { toastBus, ToastType } from "../lib/toast";
import { playSuccess, playError } from "../lib/sfx";

export default function ToastHost() {
  const [msg, setMsg] = React.useState("");
  const [type, setType] = React.useState<ToastType>("info");
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(1)).current;
  const pulseRef = React.useRef<Animated.CompositeAnimation | null>(null);

  const stopPulse = React.useCallback(() => {
    if (pulseRef.current) {
      pulseRef.current.stop();
      pulseRef.current = null;
    }
    scale.stopAnimation();
    scale.setValue(1);
  }, [scale]);

  React.useEffect(() => {
    const h = async ({ msg, type }: { msg: string; type: ToastType }) => {
      setMsg(msg);
      setType(type);

      // sound + haptics
      if (type === "success") playSuccess();
      else if (type === "error") playError();

      // pulse only on success
      stopPulse();
      if (type === "success") {
        pulseRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.06,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1.0,
              duration: 220,
              useNativeDriver: true,
            }),
          ]),
        );
        pulseRef.current.start();
      }

      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          stopPulse();
          setMsg("");
        }
      });
    };
    toastBus.on("toast", h);
    return () => {
      toastBus.off("toast", h);
      stopPulse();
    };
  }, [opacity, scale, stopPulse]);

  const color =
    type === "success" ? "#22c55e" : type === "error" ? "#ef4444" : "#22d3ee";

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: 40,
        alignSelf: "center",
        opacity,
        transform: [
          {
            translateY: opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
          { scale },
        ],
      }}
    >
      {msg ? (
        <View
          style={{
            backgroundColor: "#06121a",
            borderRadius: 14,
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: color,
          }}
        >
          <Text style={{ color, fontWeight: "900" }}>{msg}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}
