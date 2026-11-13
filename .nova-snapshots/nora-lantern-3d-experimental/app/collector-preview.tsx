import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

/** Unlisted preview. Authenticity and claims require server verification. */
export default function CollectorCertificatePreview() {
  // This design-only screen must never reveal collector lore on a production
  // page; the actual QR route only reveals serials after server verification.
  if (!__DEV__) {
    return (
      <View style={{ flex: 1, backgroundColor: "#120d22", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#d7cbe4" }}>The collector archive is sealed.</Text>
      </View>
    );
  }
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>NOVA // ARCHIVE</Text>
      <Text style={styles.title}>Nora's Last Lantern</Text>
      <Text style={styles.star}>✦ 017 ✦</Text>
      <View style={styles.card}>
        <Text style={styles.label}>COLLECTOR'S ARCHIVE</Text>
        <Text style={styles.heading}>A light left burning.</Text>
        <Text style={styles.copy}>Some things were never meant to be forgotten. This lantern was one of them.</Text>
        <Text style={styles.quote}>“I kept the light on. Just in case.”</Text>
        <Text style={styles.copy}>The seventeenth star has a place waiting for it.</Text>
      </View>
      <Text style={styles.notice}>Preview only. Authenticity and ownership will be verified by Nova's secure redemption service when collector claims open.</Text>
      <Text style={styles.footer}>NORA VALE · SESSION 017</Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#120d22" },
  content: { flexGrow: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 72, paddingBottom: 48 },
  kicker: { color: "#c8b5e7", letterSpacing: 4, fontSize: 11, fontWeight: "700" },
  title: { color: "#f8e8bb", fontSize: 31, fontWeight: "700", textAlign: "center", marginTop: 18 },
  star: { color: "#e9bd65", fontSize: 23, letterSpacing: 7, marginTop: 24, marginBottom: 30 },
  card: { width: "100%", maxWidth: 440, borderWidth: 1, borderColor: "#ab8647", backgroundColor: "#211633", borderRadius: 20, padding: 26, alignItems: "center", gap: 22 },
  label: { color: "#d1b47e", fontSize: 10, letterSpacing: 2.5, fontWeight: "700" },
  heading: { color: "#f7e9ca", fontSize: 24, fontWeight: "700", textAlign: "center" },
  copy: { color: "#e3d9ed", fontSize: 15, lineHeight: 25, textAlign: "center" },
  quote: { color: "#f2ce86", fontStyle: "italic", fontSize: 17, textAlign: "center" },
  notice: { color: "#d7cbe4", fontSize: 14, lineHeight: 22, textAlign: "center", maxWidth: 400, marginTop: 26 },
  footer: { color: "#86759c", fontSize: 10, letterSpacing: 2, marginTop: 45 },
});
