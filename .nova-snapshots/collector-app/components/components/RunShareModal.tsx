// app/components/RunShareModal.tsx
import React, { useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import type { QuizRun } from "@lib/history";

export default function RunShareModal({
  visible,
  onClose,
  run,
}: {
  visible: boolean;
  onClose: () => void;
  run: QuizRun | null;
}) {
  const viewShotRef = useRef<ViewShot>(null);

  if (!run) return null;

  const pct = run.total ? Math.round((run.correct / run.total) * 100) : 0;
  const when = new Date(run.takenAtISO);
  const whenStr = `${when.toLocaleDateString()} • ${when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  const shareImage = async () => {
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) return;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (e) {
      console.log("Share failed", e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View style={s.sheet}>
          {/* certificate card to capture */}
          <ViewShot
            ref={viewShotRef}
            options={{ format: "png", quality: 0.98, result: "tmpfile" }}
            style={s.cardWrap}
          >
            <View style={s.card}>
              <Text style={s.brand}>Nuva Tutoring</Text>
              <Text style={s.title}>Quiz Achievement</Text>

              <View style={s.sep} />

              <Text style={s.topic} numberOfLines={2}>
                {run.topicTitle}
              </Text>

              <View style={s.row}>
                <Badge
                  label="Score"
                  value={`${run.correct}/${run.total}  (${pct}%)`}
                />
                <Badge label="Time" value={`${run.durationSec}s`} />
              </View>

              <View style={s.row}>
                <Badge
                  label="Avg / Q"
                  value={`${(run.avgSecPerQ || 0).toFixed(1)}s`}
                />
                <Badge label="Date" value={whenStr} />
              </View>

              {pct === 100 ? (
                <View
                  style={[
                    s.ribbon,
                    { backgroundColor: "#1e6a3b", borderColor: "#2aa159" },
                  ]}
                >
                  <Text style={s.ribbonTxt}>Perfect 💯</Text>
                </View>
              ) : pct >= 90 ? (
                <View
                  style={[
                    s.ribbon,
                    { backgroundColor: "#1a4766", borderColor: "#2b6d99" },
                  ]}
                >
                  <Text style={s.ribbonTxt}>Elite 90+</Text>
                </View>
              ) : null}

              <Text style={s.footer}>Keep learning. Keep glowing. ✨</Text>
            </View>
          </ViewShot>

          {/* actions */}
          <View style={s.actions}>
            <Pressable onPress={onClose} style={[s.btn, s.btnGhost]}>
              <Text style={s.btnGhostTxt}>Close</Text>
            </Pressable>
            <Pressable onPress={shareImage} style={[s.btn, s.btnPrimary]}>
              <Text style={s.btnTxt}>Share Certificate 📤</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Badge({ label, value }: { label: string; value: string | number }) {
  return (
    <View variant="bg" style={s.badge}>
      <Text style={s.badgeLabel}>{label}</Text>
      <Text style={s.badgeVal}>{String(value)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    backgroundColor: "#070b16",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    borderTopWidth: 1,
    borderColor: "#152042",
  },
  cardWrap: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2a3a78",
    backgroundColor: "#0b1020",
  },
  card: {
    padding: 18,
    alignItems: "center",
  },
  brand: {
    color: "#22d3ee",
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: { color: "#e6f0ff", fontSize: 18, fontWeight: "900" },
  sep: {
    height: 1,
    backgroundColor: "#20305f",
    alignSelf: "stretch",
    marginVertical: 10,
  },
  topic: {
    color: "#bfe1ff",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  badge: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e2b55",
    backgroundColor: "#0f1835",
    alignItems: "center",
  },
  badgeLabel: { color: "#9fb8ff", fontSize: 12, fontWeight: "800" },
  badgeVal: { color: "#e6f0ff", fontSize: 14, fontWeight: "900", marginTop: 2 },

  ribbon: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  ribbonTxt: { color: "#e6ffe6", fontWeight: "900" },
  footer: { color: "#93a8df", marginTop: 12, fontStyle: "italic" },

  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnPrimary: { backgroundColor: "#142357", borderColor: "#2a3a78" },
  btnGhost: { backgroundColor: "transparent", borderColor: "#2a3a78" },
  btnTxt: { color: "#e6f0ff", fontWeight: "900" },
  btnGhostTxt: { color: "#a6c8ff", fontWeight: "800" },
});
