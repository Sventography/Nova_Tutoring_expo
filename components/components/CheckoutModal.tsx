import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  Platform,
  Linking,
  ScrollView,
} from "react-native";
import * as MailComposer from "expo-mail-composer";
import { useThemeColors } from "../providers/ThemeBridge";
import { adjustStock, getStock } from "../lib/inventory";
import { showToast } from "../lib/toast";
import {
  DEFAULT_OWNER_EMAIL,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from "../constants/config";
import CoinStoreModal from "./CoinStoreModal";
import { purchase } from "../lib/store"; // uses coin wallet flow
import { addOrder } from "../lib/orders"; // records the order for admin

type ShopItemLite = {
  id: string;
  title: string;
  price: number;
  type?: "digital" | "physical";
  limited?: boolean;
  description?: string;
  options?: { key: string; label: string; values: string[] }[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  item: ShopItemLite | null;
};

const OWNER_EMAIL = DEFAULT_OWNER_EMAIL;
const LOW_STOCK_THRESHOLD = DEFAULT_LOW_STOCK_THRESHOLD;

export default function CheckoutModal({ visible, onClose, item }: Props) {
  const palette = useThemeColors();

  const [q, setQ] = React.useState(1);
  const [stock, setStock] = React.useState<number | null>(null);
  const [selectedOptions, setSelectedOptions] = React.useState<
    Record<string, string>
  >({});
  const [showCoins, setShowCoins] = React.useState(false);
  const mounted = React.useRef(true);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const isPhysical = item?.type === "physical";
  const isLimited = !!item?.limited;
  const needsStock = isPhysical || isLimited;
  const needsOptions = !!(item && item.options && item.options.length);
  const allSelected =
    !needsOptions ||
    (item?.options?.every((o) => !!selectedOptions[o.key]) ?? true);

  // Load stock when modal opens for items that track stock
  React.useEffect(() => {
    let live = true;
    async function load() {
      if (visible && item?.id && needsStock) {
        try {
          const s0 = await getStock(item.id, 0);
          if (live && mounted.current) setStock(s0);
        } catch {}
      } else {
        setStock(null);
      }
      // reset options on each open
      if (visible) setSelectedOptions({});
      setQ(1);
    }
    load();
    return () => {
      live = false;
    };
  }, [visible, item?.id]);

  function setOpt(key: string, val: string) {
    setSelectedOptions((prev) => ({ ...prev, [key]: val }));
  }

  async function notifyLowStock(
    it: { id: string; title: string },
    remaining: number,
  ) {
    try {
      const subject = encodeURIComponent(
        `Low stock: ${it.title} (${remaining} left)`,
      );
      const body = encodeURIComponent(
        `Heads up — inventory is low.\n\nItem: ${it.title} (${it.id})\nRemaining: ${remaining}\nTimestamp: ${new Date().toLocaleString()}\n\n— Nova App`,
      );
      // Prefer MailComposer when available
      // @ts-ignore
      if (MailComposer && MailComposer.isAvailableAsync) {
        // @ts-ignore
        const ok = await MailComposer.isAvailableAsync();
        if (ok) {
          // @ts-ignore
          await MailComposer.composeAsync({
            recipients: [OWNER_EMAIL],
            subject,
            body,
          });
          return;
        }
      }
      await Linking.openURL(
        `mailto:${OWNER_EMAIL}?subject=${subject}&body=${body}`,
      );
    } catch {}
  }

  async function onConfirm() {
    if (!item) return;

    // enforce variants
    if (needsOptions && !allSelected) {
      showToast("Select options before checkout", "error");
      return;
    }

    // enforce stock
    if (needsStock) {
      const cur = await getStock(item.id, 0);
      if (cur <= 0 || q > cur) {
        showToast(cur <= 0 ? "Sold out" : `Only ${cur} left`, "error");
        setStock(cur);
        return;
      }
    }

    // attempt coin purchase (deduct coins etc.)
    const ok = await purchase(item.id, item.price * q);
    if (!ok) {
      setShowCoins(true);
      return;
    }

    // adjust inventory if needed
    if (needsStock) {
      const next = await adjustStock(item.id, -q);
      setStock(next);
      if (next <= LOW_STOCK_THRESHOLD) {
        await notifyLowStock({ id: item.id, title: item.title }, next);
        showToast("Low stock alert sent", "success");
      }
    }

    // record the order
    try {
      await addOrder({
        itemId: item.id,
        itemTitle: item.title,
        price: item.price,
        quantity: q,
        // @ts-ignore (your Order type now supports options?: Record<string,string>)
        options: Object.keys(selectedOptions).length
          ? selectedOptions
          : undefined,
      });
    } catch {}

    showToast("Purchase complete!", "success");
    onClose();
  }

  const disabledConfirm = needsOptions && !allSelected;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 520,
            backgroundColor: palette.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: Platform.OS === "ios" ? 14 : 10,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: palette.border,
            }}
          >
            <Text
              style={{ color: palette.text, fontSize: 20, fontWeight: "900" }}
            >
              Confirm Purchase
            </Text>
            <Text style={{ color: palette.subtext, marginTop: 4 }}>
              {item?.title}
            </Text>
            {needsStock ? (
              <Text
                style={{
                  color: stock !== null && stock <= 0 ? "#ef4444" : "#9ca3af",
                  marginTop: 4,
                }}
              >
                {stock !== null
                  ? stock <= 0
                    ? "Sold Out"
                    : `Stock: ${stock}`
                  : "Checking stock..."}
              </Text>
            ) : null}
          </View>

          {/* Body */}
          <ScrollView style={{ maxHeight: 420 }}>
            <View style={{ padding: 16, gap: 14 }}>
              {/* Options */}
              {item?.options?.length ? (
                <View style={{ gap: 12 }}>
                  {item.options.map((opt) => (
                    <View key={opt.key} style={{ gap: 8 }}>
                      <Text
                        style={{ color: palette.subtext, fontWeight: "800" }}
                      >
                        {opt.label}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        {opt.values.map((v) => {
                          const on = selectedOptions[opt.key] === v;
                          return (
                            <Pressable
                              key={v}
                              onPress={() => setOpt(opt.key, v)}
                              style={({ pressed }) => ({
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: on
                                  ? palette.accent
                                  : palette.border,
                                backgroundColor: pressed
                                  ? "#07131d"
                                  : on
                                    ? "#06121a"
                                    : palette.card,
                              })}
                            >
                              <Text
                                style={{
                                  color: on ? palette.accent : palette.subtext,
                                  fontWeight: "900",
                                }}
                              >
                                {v}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                  {!allSelected ? (
                    <Text style={{ color: "#ef4444", fontWeight: "800" }}>
                      Please choose{" "}
                      {item.options
                        .filter((o) => !selectedOptions[o.key])
                        .map((o) => o.label)
                        .join(", ")}
                      .
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {/* Quantity */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: palette.text, fontWeight: "800" }}>
                  Quantity
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Pressable
                    onPress={() => setQ((q) => Math.max(1, q - 1))}
                    style={({ pressed }) => ({
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: palette.border,
                      backgroundColor: pressed ? "#0a1621" : palette.card,
                    })}
                  >
                    <Text style={{ color: palette.subtext, fontWeight: "900" }}>
                      –
                    </Text>
                  </Pressable>
                  <Text
                    style={{
                      color: palette.text,
                      fontWeight: "900",
                      minWidth: 36,
                      textAlign: "center",
                    }}
                  >
                    {q}
                  </Text>
                  <Pressable
                    onPress={() => setQ((q) => Math.min(99, q + 1))}
                    style={({ pressed }) => ({
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: palette.border,
                      backgroundColor: pressed ? "#0a1621" : palette.card,
                    })}
                  >
                    <Text style={{ color: palette.subtext, fontWeight: "900" }}>
                      +
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Total */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 4,
                }}
              >
                <Text style={{ color: palette.subtext }}>Total</Text>
                <Text style={{ color: palette.accent, fontWeight: "900" }}>
                  {item ? item.price * q : 0} coins
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: palette.border,
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: palette.border,
                backgroundColor: pressed ? "#0a1621" : palette.card,
              })}
            >
              <Text style={{ color: palette.subtext, fontWeight: "800" }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={disabledConfirm}
              style={({ pressed }) => ({
                opacity: disabledConfirm ? 0.6 : 1,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: palette.accent,
                backgroundColor: pressed ? "#07131d" : "#06121a",
              })}
            >
              <Text style={{ color: palette.accent, fontWeight: "900" }}>
                Confirm Purchase
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Coin store */}
      <CoinStoreModal visible={showCoins} onClose={() => setShowCoins(false)} />
    </Modal>
  );
}
