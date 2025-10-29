import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";

type Props = {
  visible: boolean;
  needed: number;
  onClose: () => void;
  onBuyCoins: () => void;
};

export function InsufficientCoinsModal({ visible, needed, onClose, onBuyCoins }: Props) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={S.overlay}>
        <View style={S.box}>
          <Text style={S.title}>Not enough coins</Text>
          <Text style={S.msg}>You need {needed.toLocaleString()} more coins to buy this item.</Text>

          <View style={S.row}>
            <Pressable style={[S.btn, S.cancel]} onPress={onClose}>
              <Text style={S.btnText}>Close</Text>
            </Pressable>
            <Pressable style={[S.btn, S.buy]} onPress={onBuyCoins}>
              <Text style={S.btnText}>Buy Coins</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  box: {
    backgroundColor: "#0b1820",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.4)",
    width: "100%",
    maxWidth: 360,
  },
  title: {
    color: "#00e5ff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  msg: {
    color: "#cfeaf0",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  row: { flexDirection: "row", justifyContent: "space-evenly" },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#00e5ff",
  },
  cancel: { backgroundColor: "rgba(255,255,255,0.05)" },
  buy: { backgroundColor: "rgba(0,229,255,0.15)" },
  btnText: { color: "#eaf7fb", fontWeight: "700" },
});
