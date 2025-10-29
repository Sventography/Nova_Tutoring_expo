import React, { createContext, useContext, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastCtx = { show: (msg: string) => void };
const Ctx = createContext<ToastCtx>({ show: () => {} });

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(10)).current;

  const show = (m: string) => {
    setMsg(m);
    opacity.setValue(0);
    translate.setValue(10);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translate, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]),
      Animated.delay(1600),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translate, { toValue: -10, duration: 220, useNativeDriver: true }),
      ]),
    ]).start(() => setMsg(null));
  };

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {msg ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: insets.top + 44,
            alignSelf: "center",
            backgroundColor: "#0a0e19",
            borderWidth: 1,
            borderColor: "#06b6d4",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            opacity,
            transform: [{ translateY: translate }],
            zIndex: 100,
          }}
        >
          <Text style={{ color: "#67e8f9", fontWeight: "800" }}>{msg}</Text>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

