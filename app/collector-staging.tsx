import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "./context/UserContext";
import { useIslandDecorations } from "./context/IslandDecorationContext";
import {
  COLLECTOR_REWARD_ID,
  fetchCollectorEntitlements,
  type CollectorEntitlement,
} from "./_lib/collectorClient";
import {
  COLLECTOR_STAGING_MODE,
  COLLECTOR_STAGING_BUILD_ALLOWED,
} from "./_lib/collectorStaging";

/**
 * Unlinked, DEVELOPMENT-ONLY diagnostics for isolated real-account staging.
 * No QR code is embedded, generated or claimed here. Owner status is always
 * read from the backend and the existing IslandDecorationProvider.
 */
export default function CollectorStagingDiagnostics() {
  const router = useRouter();
  const { session, isLoggedIn } = useUser();
  const island = useIslandDecorations();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(
    "Sign in with a separate staging Supabase account to begin."
  );
  const [lastServerGrants, setLastServerGrants] =
    useState<CollectorEntitlement[] | null>(null);

  const enabled = COLLECTOR_STAGING_MODE && COLLECTOR_STAGING_BUILD_ALLOWED;
  const accountId = session?.user?.id ?? null;
  const accountRef = useRef(accountId);
  accountRef.current = accountId;

  useEffect(() => {
    // Never display a previous account's server verdict after a logout or
    // a switch to a different staging Auth user.
    setChecking(false);
    setLastServerGrants(null);
    setMessage(
      accountId
        ? "Signed in. Recheck the server to confirm this account's reward."
        : "Sign in with a separate staging Supabase account to begin."
    );
  }, [accountId]);
  const ownership = island.getOwnershipInfo(COLLECTOR_REWARD_ID);
  const countInInventory = island.getInventoryCount(COLLECTOR_REWARD_ID);
  const serverOwnsCastle = useMemo(() =>
    lastServerGrants?.some((item) => item.reward_id === COLLECTOR_REWARD_ID) ?? false,
    [lastServerGrants]
  );

  const refresh = useCallback(async () => {
    if (!enabled || !session?.access_token || !island.ready) return;
    setChecking(true);
    setMessage("Checking the private collector entitlement ledger…");
    setLastServerGrants(null);
    const expectedAccount = accountId;
    try {
      // This is a signed-in authenticated read, NOT a client-side grant.
      const entitlements = await fetchCollectorEntitlements(session.access_token);
      if (accountRef.current !== expectedAccount) return;
      const synced = await island.refreshCollectorOwnership();
      if (accountRef.current !== expectedAccount) return;
      setLastServerGrants(entitlements);
      const owns = entitlements.some((item) => item.reward_id === COLLECTOR_REWARD_ID);
      setMessage(
        owns && synced
          ? "Server ownership confirmed and the island inventory was refreshed."
          : owns
            ? "Server ownership confirmed. Island inventory hasn't synced yet; retry."
            : "No #017 castle entitlement belongs to this staging account."
      );
    } catch {
      if (accountRef.current === expectedAccount) {
        setMessage(
          "Unable to verify the staging collector ledger. No local reward was granted."
        );
      }
    } finally {
      if (accountRef.current === expectedAccount) setChecking(false);
    }
  }, [accountId, enabled, session?.access_token, island]);

  if (!enabled) {
    return (
      <View style={styles.locked}>
        <Text style={styles.notice}>The collector staging diagnostics are sealed.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.kicker}>NOVA // ARCHIVE</Text>
      <Text style={styles.title}>SESSION 017 — STAGING</Text>
      <Text style={styles.notice}>
        Isolated staging only. This connects to a separate staging Supabase project
        and never issues real physical collector codes.
      </Text>

      <View style={styles.card}>
        <Text style={styles.heading}>Account-bound castle</Text>
        <Text style={styles.row}>
          Staging login: {isLoggedIn && accountId ? "signed in" : "signed out"}
        </Text>
        <Text style={styles.row}>
          Staging user: {accountId ? `${accountId.slice(0, 8)}…` : "—"}
        </Text>
        <Text style={styles.row}>
          Island provider: {island.ready ? "ready" : "loading"}
        </Text>
        <Text style={styles.row}>
          Server #017 entitlement: {
            lastServerGrants === null ? "not checked"
              : serverOwnsCastle ? "confirmed" : "not owned"
          }
        </Text>
        <Text style={styles.row}>
          Island owned count: {ownership.ownedCount}
        </Text>
        <Text style={styles.row}>
          Unplaced castle inventory: {countInInventory}
        </Text>
      </View>

      <Text style={styles.status} accessibilityRole="alert">{message}</Text>

      {!isLoggedIn ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.button}
          onPress={() => router.push("/sign-in" as never)}
        >
          <Text style={styles.buttonText}>Sign in to staging</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, (checking || !island.ready) && styles.disabled]}
          disabled={checking || !island.ready}
          onPress={refresh}
        >
          {checking ? <ActivityIndicator color="#271634" /> : (
            <Text style={styles.buttonText}>Recheck server & island inventory</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.secondary}
        onPress={() => router.push("/(tabs)/island" as never)}
      >
        <Text style={styles.secondaryText}>Open my island</Text>
      </TouchableOpacity>
      <Text style={styles.footer}>
        Check Account A, sign out, sign in as B, and check again.
        Ownership must follow the authenticated staging account, not the device.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#120d22" },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingVertical: 48, alignItems: "center" },
  locked: { flex: 1, backgroundColor: "#120d22", alignItems: "center", justifyContent: "center" },
  kicker: { color: "#d5b5f1", letterSpacing: 3, fontSize: 11, fontWeight: "800" },
  title: { color: "#f7dd9d", fontSize: 25, textAlign: "center", fontWeight: "800", marginTop: 18 },
  heading: { color: "#f6d99f", fontSize: 19, fontWeight: "800", marginBottom: 14 },
  notice: { color: "#d6c4e2", fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 20 },
  card: { width: "100%", maxWidth: 500, borderWidth: 1, borderColor: "#8c6b51", borderRadius: 18, backgroundColor: "#241934", padding: 24, marginTop: 28 },
  row: { color: "#e4d8ed", marginVertical: 7, fontSize: 14 },
  status: { color: "#f5dbac", fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 26, maxWidth: 450 },
  button: { backgroundColor: "#f0cb81", paddingVertical: 16, paddingHorizontal: 24, borderRadius: 13, marginTop: 22, minWidth: 250, alignItems: "center" },
  buttonText: { color: "#241630", fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  secondary: { borderColor: "#8c6ea6", borderWidth: 1, borderRadius: 13, paddingVertical: 14, paddingHorizontal: 22, marginTop: 14 },
  secondaryText: { color: "#f1e7ff", fontSize: 15, fontWeight: "700" },
  footer: { color: "#a99bbb", fontSize: 12, lineHeight: 20, textAlign: "center", maxWidth: 440, marginTop: 29 },
});
