import React, { useEffect, useRef, useState } from "react";
import { Platform, PanResponder, Animated, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getEquipped } from "../lib/store";
import bus from "../lib/bus";
import { getCursorForId } from "../theme/cursorMap";

const K_CURSOR_SIM = "settings.cursor_sim";

export default function CursorBridge({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cursor, setCursor] = useState<any>(null);
  const [enabled, setEnabled] = useState(true);
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  async function apply() {
    const eq = await getEquipped();
    const id = (eq as any)?.cursor ?? null;
    const url = getCursorForId(id);
    setCursor(url || null);
    if (Platform.OS === "web") {
      document.body.style.cursor = url ? `url(${url}) 16 16, auto` : "auto";
    }
  }

  async function loadSetting() {
    const v = await AsyncStorage.getItem(K_CURSOR_SIM);
    setEnabled(v !== "0");
  }

  useEffect(() => {
    apply();
    loadSetting();
    const onEq = () => apply();
    const onSet = () => loadSetting();
    bus.on("equipped_changed", onEq);
    bus.on("cursor_settings_changed", onSet);
    return () => {
      bus.off("equipped_changed", onEq);
      bus.off("cursor_settings_changed", onSet);
      if (Platform.OS === "web") document.body.style.cursor = "auto";
    };
  }, []);

  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      pos.setValue({ x: g.moveX, y: g.moveY });
    },
    onPanResponderRelease: () => {},
  });

  return (
    <>
      <Animated.View
        style={{ flex: 1 }}
        {...(Platform.OS !== "web" ? responder.panHandlers : {})}
      >
        {children}
      </Animated.View>
      {Platform.OS !== "web" && enabled && cursor && (
        <Animated.View
          style={{
            position: "absolute",
            left: pos.x,
            top: pos.y,
            pointerEvents: "none",
          }}
        >
          <Image
            source={cursor}
            style={{ width: 32, height: 32, resizeMode: "contain" }}
          />
        </Animated.View>
      )}
    </>
  );
}
