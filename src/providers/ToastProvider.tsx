import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Easing, Text, View } from "react-native";

type Toast = { id: number; text: string };
type ToastCtx = { show: (text: string) => void };

const ToastContext = createContext<ToastCtx | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const anim = useRef(new Animated.Value(0)).current;

  const show = useCallback(
    (text: string) => {
      const id = idRef.current++;
      setQueue((q) => [...q, { id, text }]);
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(anim, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => setQueue((q) => q.slice(1)));
    },
    [anim],
  );

  const value = useMemo(() => ({ show }), [show]);

  const active = queue[0];

  return (
    <ToastContext.Provider value={value}>
      <View style={{ flex: 1 }}>{children}</View>
      {active ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 60,
            alignSelf: "center",
            backgroundColor: "#0b0f14",
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: "#1c2633",
            transform: [
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
            opacity: anim,
          }}
        >
          <Text style={{ color: "#9be3ff", fontWeight: "700" }}>
            {active.text}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
