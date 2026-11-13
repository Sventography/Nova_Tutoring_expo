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

      // Normalize both modern and legacy toast payloads.
      // Legacy calls may use `msg` / `duration`; newer calls use
      // `message` / `durationMs`.
      const raw: any =
        typeof input === "string"
          ? { message: input, type: "info" }
          : input || {};

      const opts: ToastOptions = {
        title: raw.title,
        message: raw.message ?? raw.msg,
        type: raw.type ?? "info",
        durationMs: raw.durationMs ?? raw.duration,
        icon: raw.icon,
      };

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

  const bgColor = "rgba(0, 0, 0, 0.96)";
  const textColor = "#ffffff";
  const messageText = toast?.message ?? toast?.title ?? "";

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
              <Text
                style={[S.message, { color: textColor }]}
                numberOfLines={Platform.OS === "web" ? 3 : 2}
              >
                {messageText}
              </Text>
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
    zIndex: 100000,
    elevation: 100000,
  },
  toastContainer: {
    width: "84%",
    minWidth: 220,
    maxWidth: 360,
    marginHorizontal: 16,
    marginBottom: Platform.OS === "ios" ? 112 : 92,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#00E5FF",
    backgroundColor: "rgba(0, 0, 0, 0.96)",
    shadowColor: "#00E5FF",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 100001,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  title: {
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  message: {
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.2,
    textAlign: "center",
    color: "#ffffff",
  },
});