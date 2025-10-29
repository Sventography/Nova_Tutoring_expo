import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Linking,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useContextSafe } from "@/components/Toast";
import {
  getMissions,
  claimMission,
  type Mission,
  type MissionsState,
} from "@lib/missions";
import { CoinPill } from "@/components/CoinPill";

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <View variant="bg" style={s.barWrap}>
      <View style={[s.barFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

function MissionRow({
  m,
  onClaim,
}: {
  m: Mission;
  onClaim: (m: Mission) => void;
}) {
  const done = m.progress >= m.target;
  const canClaim = done && !m.claimed;
  return (
    <View style={s.card}>
      <View style={s.rowTop}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.title} numberOfLines={1}>
            {m.title}
          </Text>
          {!!m.desc && (
            <Text style={s.desc} numberOfLines={2}>
              {m.desc}
            </Text>
          )}
        </View>
        <View style={s.coinPill}>
          <Text style={s.coinTxt}>{m.rewardCoins} 🪙</Text>
        </View>
      </View>

      <View style={s.rowMid}>
        <ProgressBar value={m.progress} max={m.target} />
        <Text style={s.progressTxt}>
          {Math.min(m.progress, m.target)} / {m.target}
        </Text>
      </View>

      <View style={s.rowBottom}>
        <View
          style={[
            s.badge,
            {
              backgroundColor: m.period === "daily" ? "#0b2b44" : "#2a1742",
              borderColor: "#10304f",
            },
          ]}
        >
          <Text
            style={[
              s.badgeTxt,
              { color: m.period === "daily" ? "#8bd4ff" : "#c9a6ff" },
            ]}
          >
            {m.period === "daily" ? "Daily" : "Weekly"}
          </Text>
        </View>

        {m.claimed ? (
          <View style={s.claimedPill}>
            <Text style={s.claimedTxt}>Claimed ✓</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => canClaim && onClaim(m)}
            disabled={!canClaim}
            style={[s.claimBtn, !canClaim && { opacity: 0.6 }]}
          >
            <LinearGradient
              colors={
                canClaim ? ["#22d3ee", "#0ea5e9"] : ["#0b1627", "#0b1627"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.claimGrad}
            >
              <Text
                style={[
                  s.claimTxt,
                  { color: canClaim ? "#001018" : "#9bb7e0" },
                ]}
              >
                {canClaim
                  ? "Claim Reward"
                  : done
                    ? "Already Claimed"
                    : "In Progress"}
              </Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function MissionsScreen() {
  const toast = useContextSafe();
  const [state, setState] = React.useState<MissionsState | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [claimingAll, setClaimingAll] = React.useState(false);

  const load = React.useCallback(async () => {
    const s0 = await getMissions();
    setState(s0);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onClaim = React.useCallback(
    async (m: Mission) => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      const res = await claimMission(m.id);
      if (!res.ok) {
        setState(res.state);
        toast.show(res.error || "Could not claim", { type: "error" });
        return;
      }
      setState(res.state);
      toast.show(`+${m.rewardCoins} 🪙 claimed`, { type: "success" });
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch {}
    },
    [toast],
  );

  const missions = state?.missions ?? [];
  const daily = missions.filter((m) => m.period === "daily");
  const weekly = missions.filter((m) => m.period === "weekly");
  const completedUnclaimed = missions.filter(
    (m) => m.progress >= m.target && !m.claimed,
  );
  const canClaimAll = completedUnclaimed.length > 0;

  const onClaimAll = React.useCallback(async () => {
    if (!canClaimAll) return;
    setClaimingAll(true);
    try {
      let total = 0;
      for (const m of completedUnclaimed) {
        const res = await claimMission(m.id);
        if (res.ok) {
          total += m.rewardCoins;
          setState(res.state);
        }
      }
      if (total > 0) {
        toast.show(`+${total} 🪙 claimed (all)`, { type: "success" });
        try {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        } catch {}
      } else {
        toast.show("Nothing to claim", { type: "info" });
      }
    } finally {
      setClaimingAll(false);
      await load();
    }
  }, [canClaimAll, completedUnclaimed, load, toast]);

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <Text style={s.header}>Missions</Text>
        <CoinPill onPress={() => {}} />
      </View>

      <View style={s.topActions}>
        <Pressable
          onPress={onClaimAll}
          disabled={!canClaimAll || claimingAll}
          style={[
            s.claimAll,
            (!canClaimAll || claimingAll) && { opacity: 0.6 },
          ]}
        >
          <LinearGradient
            colors={
              canClaimAll ? ["#22d3ee", "#0ea5e9"] : ["#0b1627", "#0b1627"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.claimAllGrad}
          >
            <Text
              style={[
                s.claimAllTxt,
                { color: canClaimAll ? "#001018" : "#9bb7e0" },
              ]}
            >
              {claimingAll ? "Claiming…" : "Claim All"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      <FlatList
        ListHeaderComponent={<Text style={s.subHeader}>Daily</Text>}
        data={daily}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MissionRow m={item} onClaim={onClaim} />}
        ListFooterComponent={
          <>
            <Text style={[s.subHeader, { marginTop: 12 }]}>Weekly</Text>
            {weekly.map((m) => (
              <MissionRow key={m.id} m={m} onClaim={onClaim} />
            ))}
            <View style={{ height: 90 }} />
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#67e8f9"
          />
        }
        contentContainerStyle={{ paddingBottom: 16, paddingHorizontal: 14 }}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        onPress={() =>
          Linking.openURL("https://www.buymeacoffee.com/sventography")
        }
        style={s.fab}
      >
        <LinearGradient
          colors={["#0ea5e9", "#001018"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.fabGrad}
        >
          <Text style={s.fabTxt}>Donate</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071422", paddingTop: 10 },
  headerRow: {
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: { color: "#e6f0ff", fontSize: 22, fontWeight: "900" },
  topActions: { paddingHorizontal: 16, paddingTop: 10 },
  subHeader: {
    color: "#cfe3ff",
    fontWeight: "800",
    paddingHorizontal: 2,
    marginTop: 10,
    marginBottom: 4,
  },
  card: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
    borderColor: "#1e2b55",
    backgroundColor: "#0b1020",
  },
  rowTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  title: { color: "#e6f0ff", fontSize: 16, fontWeight: "800" },
  desc: { color: "#9bb7e0", marginTop: 2, fontSize: 13 },
  rowMid: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 10 },
  progressTxt: { fontSize: 12, fontWeight: "700", color: "#9bb7e0" },
  barWrap: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#10304f",
    overflow: "hidden",
    backgroundColor: "#0b1627",
  },
  barFill: { height: "100%", backgroundColor: "#03e5ff" },
  rowBottom: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "space-between",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeTxt: { fontSize: 12, fontWeight: "800" },
  coinPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a3a78",
    backgroundColor: "#0f1835",
  },
  coinTxt: { color: "#cfe3ff", fontWeight: "900", fontSize: 12 },
  claimedPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#10304f",
    backgroundColor: "#0b1627",
  },
  claimedTxt: { color: "#9bb7e0", fontWeight: "800" },
  claimBtn: { borderRadius: 10, overflow: "hidden" },
  claimGrad: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  claimTxt: { fontWeight: "900" },
  claimAll: { borderRadius: 10, overflow: "hidden", alignSelf: "flex-start" },
  claimAllGrad: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  claimAllTxt: { fontWeight: "900" },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 20,
    borderRadius: 30,
    overflow: "hidden",
  },
  fabGrad: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 30 },
  fabTxt: { color: "#e6f0ff", fontWeight: "900" },
});
