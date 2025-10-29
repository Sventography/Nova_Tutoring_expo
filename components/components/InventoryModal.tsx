import React from "react";
import { Modal, View, Text, Pressable, FlatList } from "react-native";
import { SHOP_ITEMS } from "../shop/items";

type Props = { visible: boolean; onClose: () => void };

export default function InventoryModal({ visible, onClose }: Props) {
  const items = Array.isArray(SHOP_ITEMS) ? SHOP_ITEMS : [];
  const managed = items.filter(
    (i) => i.type === "managed" || (i.type === "digital" && !!i.limited)
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <View style={{ width: "100%", maxWidth: 520, borderRadius: 16, backgroundColor: "#0b1220", borderWidth: 1, borderColor: "rgba(34,211,238,0.4)", padding: 16 }}>
          <Text style={{ color: "#e5faff", fontSize: 18, fontWeight: "600", marginBottom: 8 }}>Inventory</Text>
          <FlatList
            data={managed}
            keyExtractor={(it) => it.id}
            renderItem={({ item }) => (
              <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
                <Text style={{ color: "#e5faff", fontSize: 16 }}>{item.title}</Text>
                <Text style={{ color: "#7dd3fc", marginTop: 2 }}>{item.price} coins</Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={{ color: "rgba(255,255,255,0.7)", textAlign: "center", paddingVertical: 20 }}>
                No items available.
              </Text>
            }
          />
          <Pressable onPress={onClose} style={{ marginTop: 12, alignSelf: "flex-end", backgroundColor: "#00e5ff", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}>
            <Text style={{ color: "#001018", fontWeight: "600" }}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
