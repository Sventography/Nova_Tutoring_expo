import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
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

/**
 * Unlinked static QR destination. The URL's opaque code is never displayed or
 * treated as proof of ownership. The server checks authenticity and claims.
 */
export default function CollectorCertificate() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [fragmentCode, setFragmentCode] = useState<string | undefined>();
  const code = validCollectorCode(params.code) ? params.code : fragmentCode;

  // Public QR URLs use /collector#code=<opaque token>. Fragments are not sent
  // to the web server; native nova://collector?code=... links also work.
  useEffect(() => {
    let active = true;
    void Linking.getInitialURL().then((url) => {
      if (!active || !url) return;
      const fragment = url.split("#")[1] || "";
      const raw = fragment.split("&").find((part) => part.startsWith("code="));
      if (!raw) return;
      try {
        const token = decodeURIComponent(raw.slice(5));
        if (validCollectorCode(token)) setFragmentCode(token);
      } catch {
        // Ignore malformed, untrusted URL fragments.
      }
    }).catch(() => {});
    return () => { active = false; };
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
        ? "It's yours. Find Nora's Last Lantern in your island decorations."
        : "Your claim succeeded! Island inventory will sync when the archive reconnects.");
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
      ? "Nora's Last Lantern is ready in your island decorations."
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
        </>
      ) : verification.claim_state === "claimed" ? (
        <Text style={styles.notice}>This collector code has already been redeemed.</Text>
      ) : (
        <Text style={styles.notice}>
          Authentic collector keepsake. Additional edition rewards are still being prepared.
        </Text>
      )}

      {verified && message ? <Text style={styles.notice}>{message}</Text> : null}
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
  loader: { alignItems: "center", marginTop: 24 },
  button: { backgroundColor: "#f0cb81", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 25, marginTop: 28 },
  disabled: { opacity: 0.6 },
  buttonLabel: { color: "#1b1231", fontSize: 15, fontWeight: "800", textAlign: "center" },
  footer: { color: "#86759c", fontSize: 10, letterSpacing: 2, marginTop: 48 },
});
