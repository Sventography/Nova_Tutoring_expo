import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "../context/UserContext";
import { useIslandDecorations } from "../context/IslandDecorationContext";
import {
  COLLECTOR_CLAIMS_ENABLED,
  COLLECTOR_REWARD_ID,
  CollectorApiError,
  collectorCodeFromUrl,
  redeemCollectorCode,
  validCollectorCode,
  verifyCollectorCode,
  type CollectorVerification,
} from "../_lib/collectorClient";

type AccountLink = {
  userId: string | null;
  accessToken: string | null;
  code: string | null;
};
type CertificateState = {
  accountLink: AccountLink | null;
  verification: CollectorVerification | null;
  checking: boolean;
  claiming: boolean;
  message: string;
  synced: boolean;
};
const emptyCertificate = (accountLink: AccountLink | null): CertificateState => ({
  accountLink, verification: null, checking: false, claiming: false,
  message: "", synced: false,
});

/** Unlinked QR destination. The opaque code is never displayed or used as a grant. */
export default function CollectorCertificate() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const [linkCode, setLinkCode] = useState<string | null>(null);
  // On web a query string could leak through requests/referrers; ignore it.
  const nativeParam = Platform.OS !== "web" && validCollectorCode(params.code)
    ? params.code : null;
  const code = Platform.OS === "web" ? linkCode : nativeParam;

  useEffect(() => {
    // Expo Router updates native query parameters on each nova:// deep link.
    // Browser hashes need an explicit listener, including clearing an old code.
    const browser = (globalThis as typeof globalThis & {
      window?: {
        location: { href: string };
        addEventListener: (event: "hashchange", listener: () => void) => void;
        removeEventListener: (event: "hashchange", listener: () => void) => void;
      };
    }).window;
    if (Platform.OS !== "web" || !browser) return;
    const onHashChange = () => {
      setLinkCode(collectorCodeFromUrl(browser.location.href));
    };
    onHashChange();
    browser.addEventListener("hashchange", onHashChange);
    return () => {
      browser.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const { session, isLoggedIn } = useUser();
  const { refreshCollectorOwnership, getInventoryCount } = useIslandDecorations();
  const userId = isLoggedIn ? session?.user?.id || null : null;
  const accessToken = userId ? session?.access_token || null : null;
  const currentLink = useRef<AccountLink>({ userId, accessToken, code });
  if (currentLink.current.userId !== userId ||
    currentLink.current.accessToken !== accessToken || currentLink.current.code !== code) {
    // A fresh object also distinguishes A → B → A while a request is pending.
    currentLink.current = { userId, accessToken, code };
  }
  const accountLink = currentLink.current;
  const mounted = useRef(false);
  const operation = useRef<AccountLink | null>(null);
  const [state, setState] = useState<CertificateState>(() => emptyCertificate(null));
  // Hide old-account information during render, before effect cleanup can run.
  const visible = state.accountLink === accountLink ? state : emptyCertificate(accountLink);
  const { verification, checking, claiming, message, synced } = visible;
  const stillCurrent = () => mounted.current && currentLink.current === accountLink;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initial = emptyCertificate(accountLink);
    if (!COLLECTOR_CLAIMS_ENABLED || !accessToken || !validCollectorCode(code)) {
      setState(initial);
      return () => { cancelled = true; };
    }
    setState({ ...initial, checking: true });
    void verifyCollectorCode(accessToken, code)
      .then((result) => {
        if (!cancelled && stillCurrent()) {
          setState({ ...initial, verification: result });
        }
      })
      .catch((error) => {
        if (!cancelled && stillCurrent()) {
          setState({ ...initial, message: errorMessage(error) });
        }
      });
    return () => { cancelled = true; };
  }, [accountLink]);

  async function claim() {
    if (!COLLECTOR_CLAIMS_ENABLED || operation.current === accountLink ||
      !stillCurrent() || !accessToken || !validCollectorCode(code) ||
      verification?.serial_number !== 17 || verification.claim_state !== "available") return;
    operation.current = accountLink;
    setState({ ...visible, claiming: true, message: "" });
    try {
      await redeemCollectorCode(accessToken, code);
      if (!stillCurrent()) return;
      const didSync = await refreshCollectorOwnership();
      if (!stillCurrent()) return;
      setState({
        ...visible, claiming: false, synced: didSync,
        verification: { ...verification, claim_state: "yours" },
        message: didSync
          ? "Castle unlocked! Follow the steps below to place it on your island."
          : "Your claim succeeded! The castle will appear after your island inventory syncs.",
      });
    } catch (error) {
      if (stillCurrent()) setState({ ...visible, claiming: false, message: errorMessage(error) });
    } finally {
      if (operation.current === accountLink) operation.current = null;
    }
  }

  async function syncOwnedReward() {
    if (operation.current === accountLink || !stillCurrent() || !accessToken ||
      verification?.serial_number !== 17 || verification.claim_state !== "yours") return;
    operation.current = accountLink;
    setState({ ...visible, claiming: true, message: "" });
    try {
      const didSync = await refreshCollectorOwnership();
      if (!stillCurrent()) return;
      setState({ ...visible, claiming: false, synced: didSync, message: didSync
        ? "Castle ready! Follow the steps below to place it on your island."
        : "Ownership sync is temporarily unavailable. Your claim stays with your account." });
    } catch (error) {
      if (stillCurrent()) setState({ ...visible, claiming: false, message: errorMessage(error) });
    } finally {
      if (operation.current === accountLink) operation.current = null;
    }
  }

  const verified = verification?.authentic === true;
  const isSeventeen = verified && verification.serial_number === 17;
  const isOwner = isSeventeen && verification.claim_state === "yours";
  const castleWaitingToPlace = isOwner && getInventoryCount(COLLECTOR_REWARD_ID) > 0;

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
        ) : <Text style={styles.heading}>A light left burning.</Text>}
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
            {isSeventeen ? <Text style={styles.description}>
              Only this numbered keepsake carries the castle that remembers Nora.
            </Text> : null}
          </>
        ) : null}
      </View>

      {!COLLECTOR_CLAIMS_ENABLED ? (
        <Text style={styles.notice}>
          Preview only. Authenticity verification and redemption are not open yet.
        </Text>
      ) : !validCollectorCode(code) ? (
        <Text style={styles.notice}>This collector link is incomplete or invalid.</Text>
      ) : !isLoggedIn || !accessToken ? (
        <>
          <Text style={styles.notice}>
            Sign into your Nova account, then scan or reopen this QR link
            to verify your collector keepsake.
          </Text>
          <TouchableOpacity accessibilityRole="button" style={styles.button}
            onPress={() => router.push("/sign-in?mode=login" as never)}>
            <Text style={styles.buttonLabel}>Sign in to Nova</Text>
          </TouchableOpacity>
        </>
      ) : checking ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#e9bd65" />
          <Text style={styles.notice}>Checking the archive's records…</Text>
        </View>
      ) : !verified ? (
        <Text style={styles.notice}>{message || "This collector code could not be verified."}</Text>
      ) : isSeventeen && verification.claim_state === "available" ? (
        <TouchableOpacity accessibilityRole="button"
          style={[styles.button, claiming && styles.disabled]} disabled={claiming} onPress={claim}>
          <Text style={styles.buttonLabel}>
            {claiming ? "Opening the archive…" : "Claim Nora's Last Lantern"}
          </Text>
        </TouchableOpacity>
      ) : isOwner ? (
        <>
          <Text style={styles.success}>Keep it. This lantern belongs to your account.</Text>
          {!synced ? (
            <TouchableOpacity accessibilityRole="button"
              style={[styles.button, claiming && styles.disabled]} disabled={claiming}
              onPress={syncOwnedReward}>
              <Text style={styles.buttonLabel}>{claiming ? "Syncing…" : "Sync to my island"}</Text>
            </TouchableOpacity>
          ) : null}
          {castleWaitingToPlace ? (
            <View style={styles.placementGuide}>
              <Text style={styles.guideTitle}>🏰 Your castle is in Decoration Inventory</Text>
              <Text style={styles.guideBody}>
                1. Open your Island and scroll below the 3D scene.{"\n"}
                2. Tap BUILD, then open Decoration Inventory.{"\n"}
                3. Tap 🏰 Last Lantern → PLACE, then SAVE.
              </Text>
              <TouchableOpacity accessibilityRole="button" style={styles.button}
                onPress={() => router.push("/(tabs)/island" as never)}>
                <Text style={styles.buttonLabel}>Open my island</Text>
              </TouchableOpacity>
            </View>
          ) : synced ? (
            <View style={styles.placementGuide}>
              <Text style={styles.guideTitle}>🏰 Your castle is already placed!</Text>
              <Text style={styles.guideBody}>
                Nora's Last Lantern is on your island. You can move it any time using BUILD mode.
              </Text>
              <TouchableOpacity accessibilityRole="button" style={styles.button}
                onPress={() => router.push("/(tabs)/island" as never)}>
                <Text style={styles.buttonLabel}>Open my island</Text>
              </TouchableOpacity>
            </View>
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
  placementGuide: { width: "100%", maxWidth: 460, marginTop: 20, paddingHorizontal: 20, paddingVertical: 20, borderRadius: 16, borderWidth: 1, borderColor: "#b39064", backgroundColor: "#281d3b", alignItems: "center" },
  guideTitle: { color: "#f5d58e", fontSize: 16, fontWeight: "800", textAlign: "center" },
  guideBody: { color: "#e8dcef", fontSize: 14, lineHeight: 23, marginTop: 12, textAlign: "left" },
  loader: { alignItems: "center", marginTop: 24 },
  button: { backgroundColor: "#f0cb81", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 25, marginTop: 28 },
  disabled: { opacity: 0.6 },
  buttonLabel: { color: "#1b1231", fontSize: 15, fontWeight: "800", textAlign: "center" },
  footer: { color: "#86759c", fontSize: 10, letterSpacing: 2, marginTop: 48 },
});
