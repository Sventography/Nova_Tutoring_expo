// app/context/ToastContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { useTheme } from "./ThemeContext";
import { registerToast, ToastBridgeInput } from "../utils/toast";

type ToastType = "success" | "error" | "info";

export type ToastOptions = {
  title?: string;
  message?: string;
  type?: ToastType;
  durationMs?: number;
  icon?: string; // e.g. "🎉"
};

// Allow both full options OR a simple string for backwards compatibility
type ToastInput = ToastOptions | string;

type ToastContextValue = {
  show: (opts: ToastInput) => void;
  hide: () => void;
};

const ToastCtx = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { tokens } = useTheme();
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearHideTimeout();
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      setVisible(false);
      setToast(null);
    });
  }, [anim, clearHideTimeout]);

  const show = useCallback(
    (input: ToastInput) => {
      clearHideTimeout();

      console.log("[ToastContext] show() input =", input);

      // Normalize input: string → { message }
      const opts: ToastOptions =
        typeof input === "string"
          ? { message: input, type: "info" }
          : input || {};

      console.log("[ToastContext] normalized opts =", opts);

      setToast(opts);
      setVisible(true);

      Animated.timing(anim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();

      const timeout = opts.durationMs ?? 2800;
      hideTimeoutRef.current = setTimeout(() => {
        hide();
      }, timeout);
    },
    [anim, clearHideTimeout, hide]
  );

  // Bridge: let legacy utils/showToast() send into this provider
  useEffect(() => {
    const handler = (input: ToastBridgeInput) => {
      show(input as ToastInput);
    };
    registerToast(handler);
  }, [show]);

  const value = useMemo(
    () => ({
      show,
      hide,
    }),
    [show, hide]
  );

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });
  const opacity = anim;

  const bgColor =
    toast?.type === "error"
      ? "#ff3355"
      : toast?.type === "success"
      ? tokens.accent || "#00e5ff"
      : tokens.card || "rgba(15,20,30,0.95)";

  const textColor =
    toast?.type === "error" || toast?.type === "success"
      ? "#ffffff"
      : tokens.text || "#f4f8ff";

  const iconColor = textColor;

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {visible && toast && (
        <TouchableWithoutFeedback onPress={hide}>
          <View pointerEvents="box-none" style={S.rootOverlay}>
            <Animated.View
              style={[
                S.toastContainer,
                {
                  backgroundColor: bgColor,
                  opacity,
                  transform: [{ translateY }],
                  shadowColor: tokens.accent || "#00e5ff",
                },
              ]}
            >
              <View style={S.row}>
                {toast.icon ? (
                  <Text style={[S.icon, { color: iconColor }]}>
                    {toast.icon}
                  </Text>
                ) : null}

                <View style={{ flex: 1 }}>
                  {!!toast.title && (
                    <Text
                      style={[S.title, { color: textColor }]}
                      numberOfLines={1}
                    >
                      {toast.title}
                    </Text>
                  )}

                  {!!toast.message && (
                    <Text
                      style={[S.message, { color: textColor }]}
                      numberOfLines={Platform.OS === "web" ? 3 : 2}
                    >
                      {toast.message}
                    </Text>
                  )}

                  {/* If dev forgets to pass message but passes title, at least show title */}
                  {!toast.message && toast.title && (
                    <Text
                      style={[S.message, { color: textColor, opacity: 0.9 }]}
                      numberOfLines={Platform.OS === "web" ? 3 : 2}
                    >
                      {toast.title}
                    </Text>
                  )}
                </View>
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      )}
    </ToastCtx.Provider>
  );
}

// Also export default so both `import { ToastProvider }`
// and `import ToastProvider` keep working.
export default ToastProvider;

const S = StyleSheet.create({
  rootOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    justifyContent: "flex-end",
    alignItems: "center",
    pointerEvents: "box-none",
  },
  toastContainer: {
    maxWidth: 420,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.25)",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 4,
  },
  message: {
    fontWeight: "400",
    fontSize: 13,
  },
});