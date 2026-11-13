import React from "react";
import { showToast } from "../_lib/toast";
import { listOrders, ordersToCSV } from "../_lib/orders";
import {
  View,
  Text,
  Platform,
  FlatList,
  RefreshControl,
  Pressable,
  Share,
  Alert,
} from "react-native";
import { useThemeColors } from "../providers/ThemeBridge";
import { getSalesSummary, getLowStockReport } from "../_lib/analytics";
import { adjustStock } from "../_lib/inventory";

type RangeKey = "today" | "7d" | "30d" | "all";

function sinceFor(k: RangeKey) {
  const now = Date.now();
  if (k === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (k === "7d") return now - 7 * 24 * 60 * 60 * 1000;
  if (k === "30d") return now - 30 * 24 * 60 * 60 * 1000;
  return undefined;
}

export default function StatsTab() {
  async function exportCSV() {
    try {
      const csv = ordersToCSV(await listOrders());
      await Share.share({ message: csv });
      showToast("Exported!");
    } catch (e) {
      try {
        showToast("Export failed");
      } catch (_) {}
    }
  }
  const palette = useThemeColors();
  const [loading, setLoading] = React.useState(true);
  const [range, setRange] = React.useState<RangeKey>("30d");
  const [sum, setSum] = React.useState<{
    totalOrders: number;
    totalUnits: number;
    totalCoins: number;
    avgOrderCoins: number;
    topItems: any[];
    recent: any[];
  } | null>(null);
  const [low, setLow] = React.useState<
    { id: string; title: string; stock: number }[]
  >([]);
  const rangeLabel =
    range === "today"
      ? "Today"
      : range === "7d"
        ? "Last 7 days"
        : range === "30d"
          ? "Last 30 days"
          : "All time";

  async function load(r: RangeKey = range) {
    setLoading(true);
    const since = sinceFor(r);
    const [s, l] = await Promise.all([
      getSalesSummary(since),
      getLowStockReport(5),
    ]);
    setSum(s);
    setLow(l);
    setLoading(false);
  }

  React.useEffect(() => {
    load();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "ios" ? 14 : 10,
          paddingBottom: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{ color: palette.text, fontSize: 28, fontWeight: "800" }}
            >
              Stats
            </Text>
            <Text style={{ color: "#9bb7e0", marginTop: 4 }}>
              Sales overview and stock health
            </Text>
            <Text
              style={{ color: "#9bb7e0", opacity: 0.8, marginTop: 2 }}
            >
              Showing: {rangeLabel}
            </Text>
          </View>
          <Pressable
            onPress={exportCSV}
            style={({ pressed }) => ({
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: palette.accent,
              backgroundColor: pressed ? "#07131d" : "#06121a",
            })}
          >
            <Text style={{ color: palette.accent, fontWeight: "900" }}>
              Export CSV
            </Text>
          </Pressable>
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 6,
          flexDirection: "row",
          gap: 8,
        }}
      >
        {(["today", "7d", "30d", "all"] as RangeKey[]).map((k) => (
          <Pressable
            key={k}
            onPress={async () => {
              setRange(k);
              await load(k);
            }}
            style={({ pressed }) => ({
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: k === range ? palette.accent : palette.border,
              backgroundColor: pressed
                ? "#07131d"
                : k === range
                  ? "#06121a"
                  : palette.card,
            })}
          >
            <Text
              style={{
                color: k === range ? palette.accent : "#9bb7e0",
                fontWeight: "900",
              }}
            >
              {k === "today"
                ? "Today"
                : k === "7d"
                  ? "7d"
                  : k === "30d"
                    ? "30d"
                    : "All"}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={[{ k: "cards" }, { k: "top" }, { k: "low" }, { k: "recent" }]}
        keyExtractor={(i) => i.k}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => load()}
            tintColor={palette.accent}
          />
        }
        renderItem={({ item }) => {
          if (item.k === "cards") {
            return (
              <View style={{ padding: 16, gap: 12 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Card label="Total Orders" value={sum?.totalOrders ?? 0} />
                  <Card label="Units Sold" value={sum?.totalUnits ?? 0} />
                </View>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Card label="Coin Revenue" value={sum?.totalCoins ?? 0} />
                  <Card label="Avg/Order" value={sum?.avgOrderCoins ?? 0} />
                </View>
              </View>
            );
          }
          if (item.k === "top") {
            return (
              <Section title="Top Items">
                {(sum?.topItems?.length ? sum.topItems : []).map((t: any) => (
                  <Row
                    key={t.id}
                    left={t.title}
                    right={`${t.units} • ${t.coins} coins`}
                  />
                ))}
                {!sum?.topItems?.length && (
                  <Empty text="No orders in this range" />
                )}
              </Section>
            );
          }
          if (item.k === "low") {
            return (
              <Section title="Low Stock (≤5)">
                {low.length ? (
                  low.map((r) => (
                    <View
                      key={r.id}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: palette.text,
                          fontWeight: "800",
                          flexShrink: 1,
                        }}
                      >
                        {r.title}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: r.stock <= 0 ? "#ef4444" : "#f59e0b",
                            fontWeight: "900",
                          }}
                        >
                          {r.stock <= 0 ? "Sold Out" : `Left: ${r.stock}`}
                        </Text>
                        <Pressable
                          onPress={async () => {
                            await adjustStock(r.id, 10);
                            await load();
                          }}
                          style={({ pressed }) => ({
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: "#22d3ee",
                            backgroundColor: pressed ? "#05202a" : "#06121a",
                          })}
                        >
                          <Text style={{ color: "#22d3ee", fontWeight: "900" }}>
                            Restock +10
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                ) : (
                  <Empty text="All good for now" />
                )}
              </Section>
            );
          }
          if (item.k === "recent") {
            return (
              <Section title="Recent Orders">
                {(sum?.recent?.length ? sum.recent : []).map((o: any) => (
                  <Row
                    key={o.id}
                    left={`${o.itemTitle} ×${o.quantity}`}
                    right={`${o.quantity * o.price} coins`}
                    sub={`${new Date(o.createdAt).toLocaleString()}`}
                  />
                ))}
                {!sum?.recent?.length && (
                  <Empty text="No orders in this range" />
                )}
              </Section>
            );
          }
          return null;
        }}
      />
    </View>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  const palette = useThemeColors();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.card,
        padding: 14,
      }}
    >
      <Text style={{ color: "#9bb7e0", fontSize: 12 }}>{label}</Text>
      <Text
        style={{
          color: palette.text,
          fontSize: 22,
          fontWeight: "900",
          marginTop: 6,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const palette = useThemeColors();
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
      <Text
        style={{
          color: palette.text,
          fontSize: 18,
          fontWeight: "900",
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.card,
          padding: 12,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Row({
  left,
  right,
  sub,
}: {
  left: string;
  right: string;
  sub?: string;
}) {
  const palette = useThemeColors();
  return (
    <View style={{ paddingVertical: 8 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text style={{ color: palette.text, fontWeight: "800", flexShrink: 1 }}>
          {left}
        </Text>
        <Text style={{ color: palette.accent, fontWeight: "900" }}>
          {right}
        </Text>
      </View>
      {sub ? (
        <Text style={{ color: "#9bb7e0", marginTop: 4 }}>{sub}</Text>
      ) : null}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  const palette = useThemeColors();
  return <Text style={{ color: "#9bb7e0" }}>{text}</Text>;
}
