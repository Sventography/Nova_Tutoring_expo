import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useUser } from "../context/UserContext";
import { useIslandDecorations } from "../context/IslandDecorationContext";
import {
  COLLECTOR_CLAIMS_ENABLED,
  CollectorApiError,
  redeemCollectorCode,
  validCollectorCode,
  verifyCollectorCode,
  type CollectorVerification,
} from "../_lib/collectorClient";
import {
  COLLECTOR_STAGING_MODE,
  COLLECTOR_STAGING_BUILD_ALLOWED,
} from "../_lib/collectorStaging";

/**
 * Unlinked static QR destination. The URL's opaque code is never displayed or
 * treated as proof of ownership. The server checks authenticity and claims.
 */
export default function CollectorCertificate() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const [fragmentCode, setFragmentCode] = useState<string | undefined>();
  const code = validCollectorCode(params.code) ? params.code : fragmentCode;

  // A browser fragment never reaches the HTTP server. Expo Linking can
  // report null on web reload, so read the browser hash directly as well.
  // Native nova://collector?code=... remains covered by Router parameters.
  useEffect(() => {
    let active = true;
    function applyFragment(url: string | null) {
      if (!active || !url || !url.includes("#")) return;
      const fragment = url.slice(url.indexOf("#") + 1);
      try {
        // Link-sharing apps may append ?utm_source=... AFTER the #code
        // fragment. Since this is not a real URL query, URLSearchParams
        // would otherwise include it in the code and reject a valid QR.
        // Strip only the appended fragment query; the code itself must
        // still pass the exact format check and server-side hash check.
        const codeParams = fragment.split("?", 1)[0];
        const candidate = new URLSearchParams(codeParams).get("code");
        if (validCollectorCode(candidate)) setFragmentCode(candidate);
      } catch {
        // Malformed QR links do not authorize any grant.
      }
    }
    const onHashChange = () => {
      if (typeof window !== "undefined") applyFragment(window.location.href);
    };
    onHashChange();
    void Linking.getInitialURL().then(applyFragment).catch(() => {});
    const subscription = Linking.addEventListener("url", ({ url }) => applyFragment(url));
    if (typeof window !== "undefined") window.addEventListener("hashchange", onHashChange);
    return () => {
      active = false;
      subscription.remove();
      if (typeof window !== "undefined") window.removeEventListener("hashchange", onHashChange);
    };
  }, []);
  const { session, isLoggedIn } = useUser();
  const { refreshCollectorOwnership } = useIslandDecorations();
  const [verification, setVerification] = useState<CollectorVerification | null>(null);
  const [checking, setChecking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState("");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setVerification(null);
    setMessage("");
    setSynced(false);
    setChecking(false);
    if (!COLLECTOR_CLAIMS_ENABLED || !session?.access_token || !validCollectorCode(code)) {
      return () => { cancelled = true; };
    }
    setChecking(true);
    void verifyCollectorCode(session.access_token, code)
      .then((result) => { if (!cancelled) setVerification(result); })
      .catch((error) => { if (!cancelled) setMessage(errorMessage(error)); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [code, session?.access_token]);

  async function claim() {
    if (!COLLECTOR_CLAIMS_ENABLED || claiming || !session?.access_token ||
      !validCollectorCode(code) || verification?.serial_number !== 17 ||
      verification.claim_state !== "available") return;
    setClaiming(true);
    setMessage("");
    try {
      await redeemCollectorCode(session.access_token, code);
      const didSync = await refreshCollectorOwnership();
      setSynced(didSync);
      setVerification({ ...verification, claim_state: "yours" });
      setMessage(didSync
        ? "Castle unlocked! Follow the steps below to place it on your island."
        : "Your claim succeeded! The castle will appear after your island inventory syncs.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setClaiming(false);
    }
  }

  async function syncOwnedReward() {
    setClaiming(true);
    const didSync = await refreshCollectorOwnership();
    setSynced(didSync);
    setMessage(didSync
      ? "Castle ready! Follow the steps below to place it on your island."
      : "Ownership sync is temporarily unavailable. Your claim stays with your account.");
    setClaiming(false);
  }

  const verified = verification?.authentic === true;
  const isSeventeen = verified && verification?.serial_number === 17;
  const isOwner = isSeventeen && verification?.claim_state === "yours";

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>NOVA // ARCHIVE</Text>
      <Text style={styles.title}>Nora's Last Lantern</Text>
      <Text style={styles.stars}>✦  ·  ✦  ·  ✦</Text>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>
          {verified ? "AUTHENTIC COLLECTOR EDITION" : "SEALED ARCHIVE"}
        </Text>
        {isSeventeen ? (
          <>
            <Text style={styles.serial}>017</Text>
            <Text style={styles.gold}>THE SEVENTEENTH STAR</Text>
          </>
        ) : (
          <Text style={styles.heading}>A light left burning.</Text>
        )}
        <View style={styles.divider} />
        <Text style={styles.description}>
          Some things were never meant to be forgotten. This lantern was one of them.
        </Text>
        <Text style={styles.quote}>“I kept the light on. Just in case.”</Text>
        {verified ? (
          <>
            <Text style={styles.certificate}>
              Verified physical edition · {verification.serial_number} of {verification.edition_size}
            </Text>
            {isSeventeen ? (
              <Text style={styles.description}>
                Only this numbered keepsake carries the castle that remembers Nora.
              </Text>
            ) : null}
          </>
        ) : null}
      </View>

      {!COLLECTOR_CLAIMS_ENABLED ? (
        <Text style={styles.notice}>
          Preview only. Authenticity verification and redemption are not open yet.
        </Text>
      ) : !validCollectorCode(code) ? (
        <Text style={styles.notice}>This collector link is incomplete or invalid.</Text>
      ) : !isLoggedIn || !session?.access_token ? (
        <Text style={styles.notice}>
          Sign into your Nova account in the Account tab, then reopen this QR link
          to verify your collector keepsake.
        </Text>
      ) : checking ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#e9bd65" />
          <Text style={styles.notice}>Checking the archive's records…</Text>
        </View>
      ) : !verified ? (
        <Text style={styles.notice}>{message || "This collector code could not be verified."}</Text>
      ) : isSeventeen && verification.claim_state === "available" ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, claiming && styles.disabled]}
          disabled={claiming}
          onPress={claim}
        >
          <Text style={styles.buttonLabel}>
            {claiming ? "Opening the archive…" : "Claim Nora's Last Lantern"}
          </Text>
        </TouchableOpacity>
      ) : isOwner ? (
        <>
          <Text style={styles.success}>Keep it. This lantern belongs to your account.</Text>
          {!synced ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.button, claiming && styles.disabled]}
              disabled={claiming}
              onPress={syncOwnedReward}
            >
              <Text style={styles.buttonLabel}>Sync to my island</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.placementGuide}>
            <Text style={styles.guideTitle}>🏰 Your castle is in Decoration Inventory</Text>
            <Text style={styles.guideBody}>
              1. Open your Island and scroll below the 3D scene.{"\n"}
              2. Tap BUILD, then open Decoration Inventory
              (not the regular Inventory).{"\n"}
              3. Tap 🏰 Last Lantern → PLACE, then SAVE.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.button}
              onPress={() => router.push("/(tabs)/island" as never)}
            >
              <Text style={styles.buttonLabel}>Open my island</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : verification.claim_state === "claimed" ? (
        <Text style={styles.notice}>This collector code has already been redeemed.</Text>
      ) : (
        <Text style={styles.notice}>
          Authentic collector keepsake. Additional edition rewards are still being prepared.
        </Text>
      )}

      {verified && message ? <Text style={styles.notice}>{message}</Text> : null}
      {COLLECTOR_STAGING_MODE && COLLECTOR_STAGING_BUILD_ALLOWED ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.stagingButton}
          onPress={() => router.push("/collector-staging" as never)}
        >
          <Text style={styles.stagingLabel}>Inspect staging account & island inventory</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={styles.footer}>NORA VALE · SESSION 017</Text>
    </ScrollView>
  );
}

function errorMessage(error: unknown): string {
  const code = error instanceof CollectorApiError ? error.code : "";
  const messages: Record<string, string> = {
    invalid_code: "This code doesn't match the collector archive.",
    already_claimed: "This collector code has already been redeemed.",
    already_owned: "Your account already owns the seventeenth-star reward.",
    too_many_attempts: "Too many attempts. Please try again in an hour.",
    redemption_not_enabled: "Collector redemption hasn't opened yet.",
    unauthorized: "Please sign in to your Nova account and try again.",
  };
  return messages[code] || "The archive is temporarily unreachable. Please try again later.";
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#120d22" },
  content: { flexGrow: 1, alignItems: "center", paddingHorizontal: 22, paddingTop: 56, paddingBottom: 50 },
  kicker: { color: "#bfa6df", letterSpacing: 4, fontSize: 11, fontWeight: "700" },
  title: { color: "#f8e8bb", fontSize: 30, fontWeight: "700", textAlign: "center", marginTop: 18 },
  stars: { color: "#e9bd65", fontSize: 21, letterSpacing: 6, marginTop: 23, marginBottom: 30 },
  card: { width: "100%", maxWidth: 460, alignItems: "center", borderWidth: 1.5, borderColor: "#ac8647", borderRadius: 22, backgroundColor: "#211633", paddingVertical: 32, paddingHorizontal: 25 },
  eyebrow: { color: "#e6c58e", fontSize: 10, fontWeight: "800", letterSpacing: 2, textAlign: "center" },
  heading: { color: "#f7e9ca", fontSize: 25, fontWeight: "700", marginTop: 35, textAlign: "center" },
  serial: { color: "#f2d28b", fontSize: 74, fontWeight: "800", letterSpacing: 12, marginTop: 18 },
  gold: { color: "#f0c77e", fontSize: 12, letterSpacing: 2, fontWeight: "700" },
  divider: { width: "70%", height: 1, backgroundColor: "#70577c", marginVertical: 28 },
  description: { color: "#e3d9ed", fontSize: 15, lineHeight: 25, textAlign: "center" },
  quote: { color: "#f2ce86", fontSize: 17, fontStyle: "italic", textAlign: "center", marginTop: 24 },
  certificate: { color: "#cceaf0", fontSize: 13, fontWeight: "600", marginTop: 27, marginBottom: 16, textAlign: "center" },
  notice: { color: "#d7cbe4", fontSize: 14, lineHeight: 22, textAlign: "center", maxWidth: 415, marginTop: 24 },
  success: { color: "#f4ce8b", fontSize: 16, textAlign: "center", marginTop: 24 },
  placementGuide: { width: "100%", maxWidth: 460, marginTop: 20, paddingHorizontal: 20, paddingVertical: 20, borderRadius: 16, borderWidth: 1, borderColor: "#b39064", backgroundColor: "#281d3b", alignItems: "center" },
  guideTitle: { color: "#f5d58e", fontSize: 16, fontWeight: "800", textAlign: "center" },
  guideBody: { color: "#e8dcef", fontSize: 14, lineHeight: 23, marginTop: 12, textAlign: "left" },
  loader: { alignItems: "center", marginTop: 24 },
  button: { backgroundColor: "#f0cb81", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 25, marginTop: 28 },
  disabled: { opacity: 0.6 },
  buttonLabel: { color: "#1b1231", fontSize: 15, fontWeight: "800", textAlign: "center" },
  stagingButton: { borderColor: "#8d70a2", borderWidth: 1, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 18, marginTop: 25 },
  stagingLabel: { color: "#dbc8ed", fontWeight: "700", fontSize: 13, textAlign: "center" },
  footer: { color: "#86759c", fontSize: 10, letterSpacing: 2, marginTop: 48 },
});
