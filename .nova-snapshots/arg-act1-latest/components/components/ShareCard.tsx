// app/components/ShareCard.tsx
import React, { useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

export type SharePayload = {
  title: string;
  score: string; // "18/20"
  duration: string; // "75s"
  badges?: string[]; // optional icons or short labels
  takenAtISO: string;
};

export default function ShareCard({ data }: { data: SharePayload }) {
  const ref = useRef<ViewShot>(null);

  const onShare = async () => {
    try {
      const uri = await ref.current?.capture?.({ format: "png", quality: 1 });
      if (!uri) return;
      // move into cache with nicer name
      const dest = FileSystem.cacheDirectory! + `Result-${Date.now()}.png`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest);
      }
    } catch {}
  };

  return (
    <View variant="bg">
      <ViewShot ref={ref} style={s.card}>
        <Text style={s.title}>Study Result</Text>
        <Text style={s.topic}>{data.title}</Text>
        <Text style={s.big}>{data.score}</Text>
        <Text style={s.meta}>Time: {data.duration}</Text>
        <Text style={s.meta}>{new Date(data.takenAtISO).toLocaleString()}</Text>
        {data.badges?.length ? (
          <View style={s.badges}>
            {data.badges.map((b, i) => (
              <Text key={i} style={s.badge}>
                {b}
              </Text>
            ))}
          </View>
        ) : null}
        <Text style={s.footer}>Made with Nuva Tutoring</Text>
      </ViewShot>

      <Pressable style={s.shareBtn} onPress={onShare}>
        <Text style={s.shareTxt}>Share Image</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    width: 320,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    backgroundColor: "#0b0f1c",
    borderColor: "#24305e",
    alignSelf: "center",
  },
  title: { color: "#93a8df", fontWeight: "800", textAlign: "center" },
  topic: {
    color: "#e6f0ff",
    fontWeight: "900",
    textAlign: "center",
    marginTop: 4,
  },
  big: {
    color: "#a7f3d0",
    fontWeight: "900",
    fontSize: 42,
    textAlign: "center",
    marginTop: 8,
  },
  meta: { color: "#cfe3ff", textAlign: "center", marginTop: 2 },
  badges: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 8,
    flexWrap: "wrap",
  },
  badge: {
    color: "#0a152c",
    backgroundColor: "#22d3ee",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    fontWeight: "900",
  },
  footer: { color: "#93a8df", textAlign: "center", marginTop: 8, fontSize: 12 },
  shareBtn: {
    marginTop: 10,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#142357",
    borderWidth: 1,
    borderColor: "#2a3a78",
  },
  shareTxt: { color: "#e6f0ff", fontWeight: "800" },
});
