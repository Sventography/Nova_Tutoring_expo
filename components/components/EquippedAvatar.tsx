import React, { useEffect, useState } from "react";
import { useThemeColors } from "../providers/ThemeBridge";
import { Image, View } from "react-native";
import { SHOP_ITEMS } from "../constants/shop";
import { getEquipped } from "../lib/store";
import bus from "../lib/bus";

export function EquippedAvatar({ size = 48 }: { size?: number }) {
  const palette = useThemeColors();
  const [src, setSrc] = useState<any>(null);
  async function refresh() {
    const eq = await getEquipped();
    const id = (eq as any)?.plush ?? null;
    if (!id) {
      setSrc(null);
      return;
    }
    const it = SHOP_ITEMS.find((i) => i.id === id);
    setSrc(it ? it.image : null);
  }
  useEffect(() => {
    refresh();
    const h = () => refresh();
    bus.on("equipped_changed", h);
    return () => bus.off("equipped_changed", h);
  }, []);
  if (!src)
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.card,
          borderWidth: 1,
          borderColor: palette.border,
        }}
      />
    );
  return (
    <Image
      source={src}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );
}
