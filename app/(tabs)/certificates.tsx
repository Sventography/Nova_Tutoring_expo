// app/(tabs)/certificates.tsx
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Platform,
  Linking,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CertificateView from "../components/CertificateView";
import { listCertificates, createCertificate } from "../utils/certificates";
import Constants from "expo-constants";
import { useUser } from "../context/UserContext";
import { useFocusEffect } from "expo-router";
import { captureRef } from "react-native-view-shot";

type SavedImage = { title: string; image: string; fileUri: string };

// Allow both name and username; data may have either
type CertificateMeta = {
  name?: string;
  username?: string;
  quizTitle: string;
  scorePct: number;
  dateISO?: string;
};

// hard off (no matter what __DEV__ is)
const SHOW_DEV_CERT_BUTTON = false;

export default function CertificatesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = (insets?.top ?? 0) + 6;

  const { width } = useWindowDimensions();
  const CERT_BASE_W = 520;
  const PREVIEW_W = Math.min(CERT_BASE_W, Math.max(280, width - 24));
  const PREVIEW_SCALE = Math.min(1, PREVIEW_W / CERT_BASE_W);

  const { user } = useUser();

  const [images, setImages] = useState<SavedImage[]>([]);
  const [unlocked, setUnlocked] = useState<CertificateMeta[]>([]);

  // Hidden export render
  const captureWrapperRef = useRef<View | null>(null);
  const [rendering, setRendering] = useState<CertificateMeta | null>(null);

  // Pending export request (so we can safely run capture in an effect)
  const [pendingExport, setPendingExport] = useState<{
    rec: CertificateMeta;
    mode: "share" | "print";
  } | null>(null);

  // Helper: get the name we should actually show/use on the cert
  // 🔧 CHANGED: now always prefers current user first, THEN record
  const getDisplayName = useCallback(
    (rec: CertificateMeta | null): string => {
      // 1) Prefer current logged-in user
      const fromUser =
        (user?.username && user.username.trim()) ||
        (user?.name && user.name.trim());
      if (fromUser) {
        return fromUser;
      }

      // 2) Fall back to whatever is stored on the record
      if (rec) {
        const fromRec =
          (rec.name && rec.name.trim()) ||
          (rec.username && rec.username.trim());
        if (fromRec) {
          return fromRec;
        }
      }

      // 3) Final fallback
      return "Nova Student";
    },
    [user]
  );

  const refreshUnlocked = useCallback(async () => {
    try {
      const list = await listCertificates();
      setUnlocked(Array.isArray(list) ? (list as CertificateMeta[]) : []);
    } catch (e) {
      console.warn("refreshUnlocked failed", e);
    }
  }, []);

  async function devAward() {
    if (!SHOW_DEV_CERT_BUTTON) return;
    try {
      const name = user?.username || user?.name || "Nova Student";
      const quizTitle = "DEV — Algebra I";
      const scorePct = 95;
      await createCertificate({ name, quizTitle, scorePct });
      await refreshUnlocked();
      alert("DEV certificate added! Open Unlocked Certificates below.");
    } catch (e) {
      console.warn("devAward failed", e);
      alert("DEV award failed — check console.");
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("certificates");
        if (raw) setImages(JSON.parse(raw));
      } catch (e) {
        console.warn("load legacy certificates failed", e);
      }
    })();
  }, []);

  useEffect(() => {
    refreshUnlocked();
  }, [refreshUnlocked]);

  useFocusEffect(
    useCallback(() => {
      refreshUnlocked();
    }, [refreshUnlocked])
  );

  function slugify(s: string) {
    return String(s)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
  }

  function backendBase() {
    const env = String(process?.env?.EXPO_PUBLIC_BACKEND_URL || "").trim();
    let base =
      env ||
      (Constants?.expoConfig as any)?.extra?.backendUrl ||
      "http://127.0.0.1:8787";

    base = String(base).trim().replace(/\/+$/, "");

    if (Platform.OS === "android" && /127\.0\.0\.1|localhost/.test(base)) {
      base = "http://10.0.2.2:8787";
    }
    return base;
  }

  async function captureWebElementById(id: string) {
    if (typeof document === "undefined") throw new Error("no document");
    const el: any =
      document.getElementById(id) ||
      document.querySelector(`[data-nativeid="${id}"]`) ||
      document.querySelector(`[nativeid="${id}"]`) ||
      document.querySelector(`#${id}`);
    if (!el) throw new Error("element not found: " + id);

    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(el as HTMLElement, {
      backgroundColor: "transparent",
      scale: 2,
      useCORS: true,
    });
    return canvas.toDataURL("image/png");
  }

  async function shareOut(fileUriOrDataUrl: string, filename: string) {
    if (Platform.OS === "web") {
      const a = document.createElement("a");
      a.href = fileUriOrDataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    try {
      const Sharing = await import("expo-sharing");
      // @ts-ignore
      await Sharing.shareAsync(fileUriOrDataUrl);
    } catch (e) {
      console.warn("shareOut failed", e);
      alert("Sorry—couldn’t share the certificate.");
    }
  }

  async function printOutWeb(dataUrl: string, title: string) {
    const w = window.open("", "_blank");
    if (!w) throw new Error("Popup blocked");
    const safeTitle = String(title || "Certificate").replace(/</g, "&lt;");
    w.document.open();
    w.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    html,body{margin:0;padding:0;background:#000;}
    .wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;}
    img{max-width:100%;height:auto;}
    @media print { body{background:#fff;} }
  </style>
</head>
<body>
  <div class="wrap">
    <img src="${dataUrl}" alt="certificate" />
  </div>
  <script>
    window.focus();
    setTimeout(() => { window.print(); }, 150);
  </script>
</body>
</html>`);
    w.document.close();
  }

  async function printOutNative(fileUri: string) {
    try {
      const Print = await import("expo-print");
      // @ts-ignore
      await Print.printAsync({ uri: fileUri });
      return;
    } catch {
      // fall through to HTML print
    }
    try {
      const Print = await import("expo-print");
      const FileSystem = await import("expo-file-system");
      const b64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const html = `<!doctype html><html><body style="margin:0"><img style="width:100%" src="data:image/png;base64,${b64}" /></body></html>`;
      // @ts-ignore
      await Print.printAsync({ html });
    } catch (e) {
      console.warn("Print failed", e);
      alert("Sorry—couldn’t print the certificate.");
    }
  }

  // Defer capture to an effect so the hidden view is fully mounted
  useEffect(() => {
    if (!pendingExport) return;

    let cancelled = false;

    const run = async () => {
      const { rec, mode } = pendingExport;
      const filename = `certificate-${slugify(rec.quizTitle)}-${Date.now()}.png`;

      try {
        setRendering(rec);
        // Wait a tick so the React tree & layout are committed
        await new Promise((r) => setTimeout(r, 120));
        if (cancelled) return;

        if (Platform.OS === "web") {
          const dataUrl = await captureWebElementById("cert-real-capture");
          if (mode === "print") {
            await printOutWeb(dataUrl, rec.quizTitle);
          } else {
            await shareOut(dataUrl, filename);
          }
        } else {
          // Native: capture with react-native-view-shot and use the URI directly
          const uri: any = await captureRef(captureWrapperRef, {
            format: "png",
            quality: 1,
          });

          if (!uri) {
            throw new Error("captureRef returned empty uri");
          }

          if (mode === "print") {
            await printOutNative(String(uri));
          } else {
            await shareOut(String(uri), filename);
          }
        }
      } catch (e) {
        console.warn("Export failed", e);
        alert("Sorry—couldn’t generate the certificate.");
      } finally {
        if (!cancelled) {
          setRendering(null);
          setPendingExport(null);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [pendingExport]);

  // Called by buttons
  function exportRealCert(rec: CertificateMeta, mode: "share" | "print") {
    // Make sure the record we pass along has a solid name
    const displayName = getDisplayName(rec);
    setPendingExport({ rec: { ...rec, name: displayName }, mode });
  }

  // PDF: don't fetch/download on native; just open the URL
  async function exportPdf(
    rec: CertificateMeta,
    _mode: "download" | "print" | "share"
  ) {
    try {
      const base = backendBase();
      const url =
        base +
        "/api/certificate.pdf?user=" +
        encodeURIComponent(getDisplayName(rec)) +
        "&topic=" +
        encodeURIComponent(rec.quizTitle) +
        "&score=" +
        encodeURIComponent(String(Math.round(rec.scorePct)));

      if (Platform.OS === "web") {
        // @ts-ignore
        window.open(url, "_blank");
        return;
      }

      try {
        const mod = await import("expo-web-browser");
        await mod.openBrowserAsync(url);
        return;
      } catch {}

      await Linking.openURL(url);
    } catch (e) {
      console.warn("PDF open failed", e);
      alert("Sorry — couldn’t open the PDF certificate.");
    }
  }

  function handlePreview() {
    alert(
      "This is an example preview. Earn ≥ 80% on any quiz to unlock real certificates you can export."
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[s.container, { paddingTop: topPad }]}
    >
      <Text style={s.title}>Certificates</Text>

      {SHOW_DEV_CERT_BUTTON ? (
        <Pressable
          style={[s.btnMuted, { marginBottom: 12 }]}
          onPress={devAward}
        >
          <Text style={s.btnMutedTxt}>DEV: Award 95% Certificate</Text>
        </Pressable>
      ) : null}

      <View style={s.note}>
        <Text style={s.noteText}>
          The card below is an <Text style={s.noteStrong}>example preview</Text>.
          Score <Text style={s.noteStrong}>80%+</Text> on any quiz to unlock a{" "}
          <Text style={s.noteStrong}>real certificate</Text> you can export.
        </Text>
      </View>

      {/* Preview certificate (Sample) */}
      <View
        style={{ alignItems: "center", marginBottom: 20, width: "100%" }}
      >
        <View
          nativeID="cert-demo"
          style={{ width: PREVIEW_W, alignItems: "center" }}
        >
          <View
            style={{
              width: CERT_BASE_W,
              transform: [{ scale: PREVIEW_SCALE }],
            }}
          >
            <CertificateView
              username={user?.username || "Guest"}
              topic="Sample Quiz"
              date={new Date().toLocaleDateString()}
              scorePct={100}
              orgName="Nova Tutoring"
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Pressable style={s.btnMuted} onPress={handlePreview}>
            <Text style={s.btnMutedTxt}>Example only</Text>
          </Pressable>

          {Platform.OS === "web" ? (
            <Pressable
              style={s.btn}
              onPress={async () => {
                try {
                  const dataUrl = await captureWebElementById("cert-demo");
                  await printOutWeb(dataUrl, "Sample Quiz");
                } catch (e) {
                  console.warn("Print preview failed", e);
                  alert("Sorry—couldn’t print the preview.");
                }
              }}
            >
              <Text style={s.btnTxt}>Print Preview</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={s.sectionTitle}>Unlocked Certificates</Text>

      {unlocked.length === 0 ? (
        <Text style={s.empty}>
          No unlocked certificates yet. Finish a quiz with 80%+ to unlock one.
        </Text>
      ) : (
        unlocked.map((rec, i) => {
          const displayName = getDisplayName(rec);
          return (
            <View
              key={`${rec.quizTitle}-${rec.dateISO ?? i}`}
              style={s.card}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.certTitle}>{rec.quizTitle}</Text>
                <Text style={s.certMeta}>
                  {displayName} • {Math.round(rec.scorePct)}%
                </Text>
                <Text style={s.certMetaDim}>
                  {new Date(rec.dateISO || Date.now()).toLocaleDateString()}
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                <Pressable
                  style={[s.btn, { minWidth: 170 }]}
                  onPress={() => exportRealCert(rec, "share")}
                >
                  <Text style={s.btnTxt}>
                    {Platform.OS === "web"
                      ? "Generate & Download"
                      : "Generate & Share"}
                  </Text>
                </Pressable>

                <Pressable
                  style={[s.btnOutline, { minWidth: 170 }]}
                  onPress={() => exportRealCert(rec, "print")}
                >
                  <Text style={s.btnOutlineTxt}>Generate & Print</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      {images.length > 0 && (
        <Text style={s.sectionTitle}>Saved Images (Legacy)</Text>
      )}

      {images.map((cert, i) => (
        <View key={`${cert.title}-${i}`} style={s.legacyCard}>
          <Image source={{ uri: cert.image }} style={s.legacyImg} />
          <Text style={s.legacyTitle}>{cert.title}</Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <Pressable
              style={[s.btn, { flex: 1 }]}
              onPress={() =>
                shareOut(cert.fileUri, `${slugify(cert.title)}.png`)
              }
            >
              <Text style={s.btnTxt}>
                {Platform.OS === "web" ? "Download" : "Share"}
              </Text>
            </Pressable>

            {Platform.OS === "web" ? (
              <Pressable
                style={[s.btnOutline, { flex: 1 }]}
                onPress={async () => {
                  try {
                    await printOutWeb(cert.image, cert.title);
                  } catch (e) {
                    console.warn("Legacy print failed", e);
                    alert("Sorry—couldn’t print that image.");
                  }
                }}
              >
                <Text style={s.btnOutlineTxt}>Print</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[s.btnOutline, { flex: 1 }]}
                onPress={async () => printOutNative(cert.fileUri)}
              >
                <Text style={s.btnOutlineTxt}>Print</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}

      {/* Hidden real capture area — off-screen but fully rendered */}
      <View
        style={{
          position: "absolute",
          top: -9999,
          left: -9999,
          width: CERT_BASE_W,
          pointerEvents: "none",
        }}
      >
        {rendering ? (
          <View
            nativeID="cert-real-capture"
            ref={captureWrapperRef}
            collapsable={false}
            style={{ width: "100%" }}
          >
            <CertificateView
              username={getDisplayName(rendering)}
              topic={rendering.quizTitle}
              date={new Date(
                rendering.dateISO || Date.now()
              ).toLocaleDateString()}
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
  container: { padding: 12, backgroundColor: "transparent" },
  title: {
    color: "#00e5ff",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  note: {
    backgroundColor: "#061826",
    borderColor: "#00e5ff",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  noteText: { color: "#bfefff", textAlign: "center" },
  noteStrong: { color: "#5df2ff", fontWeight: "800" },

  sectionTitle: {
    color: "#5df2ff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 6,
  },

  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
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

  legacyCard: {
    backgroundColor: "#111",
    borderWidth: 2,
    borderColor: "#00e5ff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  legacyImg: { width: "100%", height: 180, borderRadius: 8 },
  legacyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },

  btn: {
    backgroundColor: "#00e5ff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnTxt: { color: "black", fontWeight: "800", textAlign: "center" },

  btnOutline: {
    borderWidth: 2,
    borderColor: "#00e5ff",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnOutlineTxt: {
    color: "#00e5ff",
    fontWeight: "900",
    textAlign: "center",
  },

  btnOutline2: {
    borderWidth: 2,
    borderColor: "#5df2ff",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnOutline2Txt: {
    color: "#5df2ff",
    fontWeight: "900",
    textAlign: "center",
  },

  btnMuted: {
    backgroundColor: "#0b2a33",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnMutedTxt: {
    color: "#bfefff",
    fontWeight: "800",
    textAlign: "center",
  },

  empty: { color: "#94cfe0", marginBottom: 8 },
});
