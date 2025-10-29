import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";

type Props = {
  username?: string;
  topic?: string;
  date?: string;
  score?: number | string;
  style?: ViewStyle;
};

export default function CertificateCanvas({
  username = "Student",
  topic = "Achievement",
  date,
  score,
  style
}: Props) {
  const issued = date || new Date().toISOString().slice(0, 10);
  return (
    <View style={[styles.card, style]}>
      <View style={styles.ribbonTop} />
      <Text style={styles.title}>Certificate of Achievement</Text>
      <Text style={styles.label}>Awarded to</Text>
      <Text style={styles.name}>{username}</Text>
      <Text style={styles.label}>For</Text>
      <Text style={styles.topic}>{topic}</Text>
      {typeof score !== "undefined" ? (
        <Text style={styles.score}>Score: {String(score)}</Text>
      ) : null}
      <Text style={styles.date}>Issued: {issued}</Text>
      <View style={styles.seal}>
        <Text style={styles.sealText}>NOVA</Text>
      </View>
      <View style={styles.ribbonBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 640,
    height: 450,
    borderRadius: 24,
    backgroundColor: "#0b1220",
    borderWidth: 2,
    borderColor: "#1f2a44",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28
  },
  title: {
    color: "#e5e7eb",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8
  },
  label: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 8
  },
  name: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4
  },
  topic: {
    color: "#a5b4fc",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center"
  },
  score: {
    color: "#93c5fd",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6
  },
  date: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 10
  },
  seal: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: "#111827",
    borderColor: "#0ea5e9",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.5,
    shadowRadius: 8
  },
  sealText: { color: "#0ea5e9", fontWeight: "900", letterSpacing: 1 },
  ribbonTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#0ea5e9"
  },
  ribbonBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "#6366f1"
  }
});
