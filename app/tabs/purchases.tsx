import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

const LOG_KEY = "@nova/coin_log";

export default function Purchases() {
  const [logs, setLogs] = useState<{ delta: number; note: string; date: string }[]>([]);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(LOG_KEY);
      if (raw) setLogs(JSON.parse(raw).reverse());
    })();
  }, []);

  return (
    <LinearGradient colors={["#000000", "#001622"]} style={{ flex: 1, padding: 16 }}>
      <Text style={{ color: "#cfeaf0", fontSize: 24, fontWeight: "800", marginBottom: 16 }}>
        Purchases
      </Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {logs.length === 0 ? (
          <Text style={{ color: "#8ca7b0" }}>No purchases or coin history yet.</Text>
        ) : (
          logs.map((log, i) => (
            <View
              key={i}
              style={{
                borderWidth: 1,
                borderColor: log.delta > 0 ? "#00e5ff" : "#ff5555",
                borderRadius: 10,
                padding: 10,
                marginBottom: 10,
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
            >
              <Text style={{ color: "#eaf7fb", fontWeight: "700" }}>{log.note}</Text>
              <Text
                style={{
                  color: log.delta > 0 ? "#00ffc8" : "#ff8a8a",
                  fontWeight: "600",
                  marginTop: 4,
                }}
              >
                {log.delta > 0 ? `+${log.delta}` : log.delta} coins
              </Text>
              <Text style={{ color: "#93a9b0", fontSize: 12, marginTop: 4 }}>{log.date}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
}
