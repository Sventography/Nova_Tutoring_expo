import React from "react";
import { Modal, View, Text, Pressable } from "react-native";

export default function InsufficientCoinsModal({
  visible, needed, onClose, onBuyCoins,
}: { visible: boolean; needed: number; onClose: () => void; onBuyCoins: () => void }) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:"rgba(0,0,0,0.6)", alignItems:"center", justifyContent:"center", padding:24 }}>
        <View style={{ width:"100%", maxWidth:480, backgroundColor:"#06121a", borderRadius:14, borderWidth:1, borderColor:"#00e5ff", padding:16 }}>
          <Text style={{ color:"#cfeaf0", fontSize:18, fontWeight:"800" }}>Not enough coins</Text>
          <Text style={{ color:"#a6cbd6", marginTop:8 }}>You need {needed.toLocaleString()} more coins.</Text>
          <View style={{ flexDirection:"row", justifyContent:"flex-end", gap:12, marginTop:16 }}>
            <Pressable onPress={onClose} style={{ paddingVertical:10, paddingHorizontal:12 }}>
              <Text style={{ color:"#98c7d1" }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onBuyCoins}
              style={{ paddingVertical:10, paddingHorizontal:14, borderRadius:8, backgroundColor:"#00e5ff" }}
            >
              <Text style={{ color:"#052029", fontWeight:"800" }}>Buy Coins</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
