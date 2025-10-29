import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, Animated, Dimensions } from "react-native";
type Toast = { id: string; text: string };
type Ctx = { show: (text: string) => void };
const ToastContext = createContext<Ctx>({ show: () => {} });
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const y = new Animated.Value(0);
  const showing = useRef(false);
  const show = (text: string) => {
    const id = Date.now().toString(36);
    setToasts((t) => [...t, { id, text }]);
    if (!showing.current) {
      showing.current = true;
      Animated.timing(y, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    setTimeout(() => {
      setToasts((t) => t.slice(1));
      if (toasts.length <= 1) {
        Animated.timing(y, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          showing.current = false;
        });
      }
    }, 2200);
  };
  const v = useMemo(() => ({ show }), []);
  const translateY = y.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });
  const opacity = y;
  const width = Dimensions.get("window").width;
  return (
    <ToastContext.Provider value={v}>
      {children}
      <Animated.View
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          alignItems: "center",
          transform: [{ translateY }],
          opacity,
          pointerEvents: "none",
        }}
      >
        {toasts.slice(0, 1).map((t) => (
          <View
            key={t.id}
            style={{
              backgroundColor: "#111827",
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 10,
              maxWidth: width * 0.9,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>{t.text}</Text>
          </View>
        ))}
      </Animated.View>
    </ToastContext.Provider>
  );
};
export const useToast = () => useContext(ToastContext);
