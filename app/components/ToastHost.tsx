// app/components/ToastHost.tsx
import React from "react";
import {
  View,
  Text,
  Animated,
  Easing,
  Platform,
  StyleSheet,
} from "react-native";
import { onToast } from "../utils/toast";

type RawToast = {
  id?: number | string;
  msg?: string; // legacy string
  message?: string; // new API
  title?: string;
  icon?: string;
  duration?: number;
};

type Item = {
  key: number;
  title?: string;
  message?: string;
  icon?: string;
};

export default function ToastHost() {
  const [items, setItems] = React.useState<Item[]>([]);
  const timers = React.useRef<Map<number, NodeJS.Timeout>>(
    new Map()
  ).current;
  const counterRef = React.useRef(1);

  React.useEffect(() => {
    const off = onToast((t: RawToast | string) => {
      // Support both: onToast("hi") and onToast({ title, message, icon })
      const raw: RawToast =
        typeof t === "string"
          ? { message: t }
          : t || {};

      const key = counterRef.current++;
      const title = raw.title;
      const message =
        raw.message ??
        raw.msg ??
        ""; // prefer `message`, fall back to `msg`
      const icon = raw.icon;

      setItems((prev) => [...prev, { key, title, message, icon }]);

      const duration = raw.duration ?? 2800;
      const to = setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.key !== key));
        timers.delete(key);
      }, duration);
      timers.set(key, to);
    });

    return () => {
      off();
      timers.forEach((to) => clearTimeout(to));
      timers.clear();
    };
  }, [timers]);

  return (
    <View pointerEvents="none" style={S.wrap}>
      {items.map((it, idx) => (
        <ToastBubble
          key={it.key}
          index={idx}
          title={it.title}
          message={it.message}
          icon={it.icon}
        />
      ))}
    </View>
  );
}

function ToastBubble({
  title,
  message,
  icon,
  index,
}: {
  title?: string;
  message?: string;
  icon?: string;
  index: number;
}) {
  const y = React.useRef(new Animated.Value(-20)).current;
  const op = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(y, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(op, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [op, y]);

  const webShadow =
    Platform.OS === "web"
      ? ({
          boxShadow:
            "0 0 22px rgba(93,242,255,0.9), 0 0 8px rgba(255,255,255,0.25)",
        } as any)
      : {
          shadowColor: "#5df2ff",
          shadowOpacity: 0.95,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        };

  // Fallback so we never render an *empty* toast
  const hasTitle = !!title;
  const hasMessage = !!message;
  const finalMessage = hasMessage ? message : hasTitle ? title : icon || "";

  return (
    <Animated.View
      style={[
        S.toast,
        webShadow,
        {
          transform: [{ translateY: y }],
          opacity: op,
          top: 12 + index * 60,
        },
      ]}
    >
      <View style={S.row}>
        {icon ? <Text style={S.icon}>{icon}</Text> : null}

        <View style={{ flex: 1 }}>
          {hasTitle && (
            <Text style={S.title} numberOfLines={1}>
              {title}
            </Text>
          )}
          {hasMessage && (
            <Text style={S.text} numberOfLines={2}>
              {message}
            </Text>
          )}

          {/* If for some reason we only got a bare string */}
          {!hasTitle && !hasMessage && finalMessage ? (
            <Text style={S.text} numberOfLines={2}>
              {finalMessage}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

export const S = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100000, // above everything
    alignItems: "center",
    ...(Platform.OS === "web"
      ? ({ pointerEvents: "none" } as any)
      : null),
  },
  toast: {
    maxWidth: 560,
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.6,
    borderColor: "rgba(93,242,255,0.95)",
    backgroundColor: "rgba(0,12,20,0.92)",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  icon: {
    fontSize: 22,
    marginRight: 10,
    marginTop: 1,
  },
  title: {
    color: "#eafcff",
    fontWeight: "800",
    letterSpacing: 0.3,
    fontSize: 14,
    marginBottom: 2,
  },
  text: {
    color: "#eafcff",
    fontWeight: "500",
    letterSpacing: 0.2,
    fontSize: 13,
  },
});