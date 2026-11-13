import React from "react";
import { View, Image, Text } from "react-native";
import { useUser } from "../context/UserContext";
import { useAskStats } from "../state/AskStatsContext";

export default function HeaderUserPills() {
  const { username, avatarUri, coins } = useUser();
  const { asked } = useAskStats();

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 10, left: 12, right: 12, zIndex: 50, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Image
          source={avatarUri ? { uri: avatarUri } : require("../assets/shop/nova_bunny_front.png")}
          style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "#00e5ff" }}
        />
        <Text style={{ color: "#baf8ff", fontWeight: "800" }}>{username || "Guest"}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ backgroundColor: "rgba(0,229,255,0.14)", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: "#e6f7fb", fontWeight: "800" }}>⭑ {coins}</Text>
        </View>
        <View style={{ backgroundColor: "rgba(178,102,255,0.14)", borderColor: "rgba(178,102,255,0.8)", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: "#e6f7fb", fontWeight: "800" }}>Q {asked}</Text>
        </View>
      </View>
    </View>
  );
}
