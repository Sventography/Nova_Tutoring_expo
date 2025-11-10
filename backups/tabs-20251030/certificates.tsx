import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Platform } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCoins } from "../context/CoinsContext";
import { useUser } from "../context/UserContext";
import CertificateView from "../components/CertificateView";
import { listCertificates } from "../utils/certificates";

type SavedImage = { title: string; image: string; fileUri: string };
type CertificateMeta = { name: string; quizTitle: string; scorePct: number; dateISO?: string };

export default function CertificatesScreen() {
  const { user } = useUser();
  const { addCoins } = useCoins();

  const [images, setImages] = useState<SavedImage[]>([]);           // legacy PNGs
  const [unlocked, setUnlocked] = useState<CertificateMeta[]>([]);   // ≥80% earned

  const captureRefView = useRef<View>(null);
  const [rendering, setRendering] = useState<CertificateMeta | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("certificates");
        if (raw) setImages(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = await listCertificates();
        setUnlocked(Array.isArray(list) ? (list as CertificateMeta[]) : []);
      } catch {}
    })();
  }, []);

  function slugify(s: string) {
    return String(s).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  }

  async function captureWebElementById(id: string) {
    const el = typeof document !== "undefined" ? document.getElementById(id) : null;
    if (!el) throw new Error("element not found: " + id);
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(el as HTMLElement, {
      backgroundColor: "#000000",
      scale: 2,
      useCORS: true,
    });
    return canvas.toDataURL("image/png");
  }

  async function shareOut(fileUri: string, filename: string) {
    if (Platform.OS === "web") {
      const a = document.createElement("a");
      a.href = fileUri;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    try { await Sharing.shareAsync(fileUri); } catch {}
  }

  async function exportRealCert(rec: CertificateMeta) {
    setRendering(rec);
    await new Promise((r) => setTimeout(r, 60));
    try {
      const filename = `certificate-${slugify(rec.quizTitle)}-${Date.now()}.png`;
      if (Platform.OS === "web") {
        const dataUrl = await captureWebElementById("cert-real-capture");
        await shareOut(dataUrl, filename);
      } else {
        const uri: any = await captureRef(captureRefView, { format: "png", quality: 1 });
        const file = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.copyAsync({ from: String(uri), to: file });
        await shareOut(file, filename);
      }
    } catch (e) {
      console.warn("Export failed", e);
      alert("Sorry—couldn’t generate the certificate.");
    } finally {
      setRendering(null);
    }
  }

  function handlePreview() {
    alert("This is an example preview. Earn \u2265 80% on any quiz to unlock a real certificate you can download.");
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.title}>Certificates</Text>

      <View style={s.note}>
        <Text style={s.noteText}>
          The card below is an <Text style={s.noteStrong}>example preview</Text>. Score{" "}
          <Text style={s.noteStrong}>80%+</Text> on any quiz to unlock a{" "}
          <Text style={s.noteStrong}>real certificate</Text> you can download.
        </Text>
      </View>

      {/* Example preview */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <View nativeID="cert-demo">
          <CertificateView
            username={user?.username || "Guest"}
            topic="Sample Quiz"
            date={new Date().toLocaleDateString()}
            scorePct={100}
            orgName="Nova Tutoring"
          />
        </View>
        <Pressable style={s.btn} onPress={handlePreview}>
          <Text style={s.btnTxt}>This is just an example</Text>
        </Pressable>
      </View>

      {/* Unlocked earned certificates */}
      <Text style={s.sectionTitle}>Unlocked Certificates</Text>
      {unlocked.length === 0 ? (
        <Text style={s.empty}>No unlocked certificates yet. Finish a quiz with 80%+ to unlock one.</Text>
      ) : (
        unlocked.map((rec, i) => (
          <View key={i} style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.certTitle}>{rec.quizTitle}</Text>
              <Text style={s.certMeta}>{rec.name} • {Math.round(rec.scorePct)}%</Text>
              <Text style={s.certMetaDim}>{new Date(rec.dateISO || Date.now()).toLocaleDateString()}</Text>
            </View>
            <Pressable style={[s.btn, { minWidth: 160 }]} onPress={() => exportRealCert(rec)}>
              <Text style={s.btnTxt}>{Platform.OS === "web" ? "Generate & Download" : "Generate & Share"}</Text>
            </Pressable>
          </View>
        ))
      )}

      {/* Legacy image gallery */}
      {images.length > 0 && <Text style={s.sectionTitle}>Saved Images (Legacy)</Text>}
      {images.map((cert, i) => (
        <View key={i} style={s.legacyCard}>
          <Image source={{ uri: cert.image }} style={s.legacyImg} />
          <Text style={s.legacyTitle}>{cert.title}</Text>
          <Pressable style={s.btn} onPress={() => shareOut(cert.fileUri, `${slugify(cert.title)}.png`)}>
            <Text style={s.btnTxt}>{Platform.OS === "web" ? "Download" : "Download / Share"}</Text>
          </Pressable>
        </View>
      ))}

      {/* Hidden render target for exporting a REAL certificate */}
      <View style={{ height: 1, overflow: "hidden" }}>
        {rendering ? (
          <View nativeID="cert-real-capture">
            <CertificateView
              ref={captureRefView}
              username={rendering.name}
              topic={rendering.quizTitle}
              date={new Date(rendering.dateISO || Date.now()).toLocaleDateString()}
              scorePct={Math.round(rendering.scorePct)}
              orgName="Nova Tutoring"
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, backgroundColor: "black" },
  title: { color: "#00e5ff", fontSize: 26, fontWeight: "900", marginBottom: 8, textAlign: "center" },
  note: { backgroundColor: "#061826", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12 },
  noteText: { color: "#bfefff", textAlign: "center" },
  noteStrong: { color: "#5df2ff", fontWeight: "800" },

  sectionTitle: { color: "#5df2ff", fontSize: 18, fontWeight: "800", marginTop: 8, marginBottom: 6 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderWidth: 2,
    borderColor: "#00e5ff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  certTitle: { color: "#eafcff", fontSize: 16, fontWeight: "800" },
  certMeta: { color: "#bfefff", marginTop: 2 },
  certMetaDim: { color: "#8cc9da", marginTop: 2, fontSize: 12 },

  legacyCard: { backgroundColor: "#111", borderWidth: 2, borderColor: "#00e5ff", borderRadius: 12, padding: 12, marginBottom: 14 },
  legacyImg: { width: "100%", height: 180, borderRadius: 8 },
  legacyTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginVertical: 8 },

  btn: { backgroundColor: "#00e5ff", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: "center" },
  btnTxt: { color: "black", fontWeight: "800", textAlign: "center" },

  empty: { color: "#94cfe0", marginBottom: 8 },
});
