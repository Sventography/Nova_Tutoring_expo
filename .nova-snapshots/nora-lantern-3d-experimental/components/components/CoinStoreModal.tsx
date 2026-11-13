import React, { useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  Platform,
  FlatList,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useThemeColors } from "../providers/ThemeBridge";
import { COIN_PACKAGES } from "../constants/coins";
import { purchasePackage } from "../lib/payments";
import { addCoins } from "../lib/wallet";

type Props = { visible: boolean; onClose: () => void };

export default function CoinStoreModal({ visible, onClose }: Props) {
  const palette = useThemeColors();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState("");

  function showToast(msg: string) {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(1600),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }

  async function buy(id: string) {
    setLoadingId(id);
    const res = await purchasePackage(id);
    setLoadingId(null);
    if (res.ok && res.coins) {
      await addCoins(res.coins);
      showToast(`Added +${res.coins} coins`);
      setTimeout(() => onClose(), 1700);
    } else {
      showToast("Purchase failed");
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
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
            maxWidth: 560,
            borderRadius: 20,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: Platform.OS === "ios" ? 14 : 10,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: palette.border,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: palette.text, fontSize: 20, fontWeight: "900" }}
            >
              Get Coins
            </Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: palette.border,
                backgroundColor: pressed ? "#0a1621" : palette.card,
              })}
            >
              <Text style={{ color: palette.subtext, fontWeight: "700" }}>
                Close
              </Text>
            </Pressable>
          </View>

          <FlatList
            data={COIN_PACKAGES}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            renderItem={({ item }) => (
              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: item.best ? palette.accent : palette.border,
                  backgroundColor: palette.card,
                  padding: 14,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: palette.text,
                        fontSize: 16,
                        fontWeight: "900",
                      }}
                    >
                      {item.title}
                      {item.best ? " • Best Value" : ""}
                    </Text>
                    <Text style={{ color: palette.subtext, marginTop: 4 }}>
                      +{item.coins} coins
                    </Text>
                  </View>
                  <Pressable
                    disabled={loadingId === item.id}
                    onPress={() => buy(item.id)}
                    style={({ pressed }) => ({
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: palette.accent,
                      backgroundColor: pressed ? "#07131d" : "#06121a",
                      minWidth: 120,
                      alignItems: "center",
                    })}
                  >
                    {loadingId === item.id ? (
                      <ActivityIndicator />
                    ) : (
                      <Text
                        style={{ color: palette.accent, fontWeight: "900" }}
                      >
                        ${item.priceUSD.toFixed(2)}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={{ color: palette.subtext, paddingHorizontal: 2 }}>
                No packages available.
              </Text>
            }
          />

          <Animated.View
            style={{
              position: "absolute",
              bottom: 14,
              left: 0,
              right: 0,
              alignItems: "center",
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            }}
          >
            {toastMsg !== "" && (
              <View
                style={{
                  backgroundColor: "#06121a",
                  borderRadius: 14,
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: palette.accent,
                }}
              >
                <Text style={{ color: palette.accent, fontWeight: "900" }}>
                  {toastMsg}
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
