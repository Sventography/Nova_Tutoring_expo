import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";

const LOG_KEY = "@nova/coin_log";

type LogEntry = { delta: number; note: string; date: string };

export default function Purchases() {
  const { tokens } = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOG_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as LogEntry[];
          setLogs(parsed.reverse());
        } else {
          setLogs([]);
        }
      } catch {
        setLogs([]);
      }
    })();
  }, []);

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text
          style={{
            color: tokens.accent,
            fontSize: 24,
            fontWeight: "800",
            marginBottom: 16,
          }}
        >
          Purchases
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {logs.length === 0 ? (
            <Text
              style={{
                color: tokens.cardText,
              }}
            >
              No purchases or coin history yet.
            </Text>
          ) : (
            logs.map((log, i) => {
              const isGain = log.delta > 0;
              return (
                <View
                  key={i}
                  style={{
                    borderWidth: 1.5,
                    borderColor: isGain ? tokens.accent : "#ff5555",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 10,
                    backgroundColor: tokens.card,
                  }}
                >
                  <Text
                    style={{
                      color: tokens.text,
                      fontWeight: "700",
                    }}
                  >
                    {log.note}
                  </Text>
                  <Text
                    style={{
                      color: isGain
                        ? tokens.accent
                        : "#ff8a8a",
                      fontWeight: "700",
                      marginTop: 4,
                    }}
                  >
                    {isGain ? `+${log.delta}` : log.delta} coins
                  </Text>
                  <Text
                    style={{
                      color: tokens.cardText,
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {log.date}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}
