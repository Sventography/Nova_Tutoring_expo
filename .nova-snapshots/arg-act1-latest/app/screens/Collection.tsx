// app/screens/Collection.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

// Root components
import HeaderBar from "../../components/HeaderBar";
import ScreenBG from "../../components/ScreenBG";

// App libs (no alias, so bundling is happy)
import * as Haptics from "../_lib/haptics";
import { Images } from "../_lib/assets";

/** ---------- Provider bridges (non-crashy) ---------- */
type Collectible = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: any;         // require(...) image source
  owned?: boolean;    // do we own it?
  rarity?: "common" | "rare" | "epic" | "legendary";
  createdAt?: number; // for sorting
};

function useCollectionsSafe(): {
  items: Collectible[];
  toggleOwned?: (id: string) => void;
} {
  // Try your real provider
  try {
    const mod = require("../_providers/CollectionsProvider");
    const hook =
      mod?.useCollections ??
      mod?.useInventory ??
      mod?.useCollection ??
      null;
    if (typeof hook === "function") {
      const api = hook();
      if (api && Array.isArray(api.items)) {
        return {
          items: api.items as Collectible[],
          toggleOwned: api.toggleOwned ?? api.toggle ?? undefined,
        };
      }
    }
  } catch {}
  // Fallback demo data so UI never breaks
  return {
    items: [
      { id: "nova-bunny", title: "Nova Bunny", subtitle: "Founding Badge", icon: Images.bunny, owned: true, rarity: "legendary", createdAt: Date.now() - 86400_000 },
      { id: "streak-7", title: "7-Day Streak", subtitle: "Consistency", icon: Images.bunny, owned: true, rarity: "rare", createdAt: Date.now() - 2 * 86400_000 },
      { id: "quiz-ace", title: "Quiz Ace", subtitle: "Score 90%+", icon: Images.bunny, owned: false, rarity: "epic", createdAt: Date.now() - 3 * 86400_000 },
      { id: "early-bird", title: "Early Bird", subtitle: "Morning Sessions", icon: Images.bunny, owned: false, rarity: "common", createdAt: Date.now() - 8 * 86400_000 },
    ],
  };
}

function useNotifySafe() {
  try {
    const m = require("../_providers/NotifProvider");
    const useNotif = m?.useNotif ?? null;
    if (typeof useNotif === "function") {
      const api = useNotif();
      if (api?.notify) return (msg: string, title?: string) => api.notify(msg, title);
    }
  } catch {}
  return (msg: string) => console.log("[toast]", msg);
}

/** ---------- Little UI helpers ---------- */
function RarityPill({ rarity }: { rarity?: Collectible["rarity"] }) {
  if (!rarity) return null;
  const label = rarity.toUpperCase();
  const color =
    rarity === "legendary" ? "#FFC54D" :
    rarity === "epic"      ? "#AC7BFF" :
    rarity === "rare"      ? "#5CD4FF" :
                             "#BFD1DD";
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: "transparent" }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

type SortKey = "newest" | "owned" | "title";

/** ---------- Screen ---------- */
export default function CollectionScreen() {
  const router = useRouter();
  const notify = useNotifySafe();
  const { items, toggleOwned } = useCollectionsSafe();

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const data = useMemo(() => {
    const base = Array.isArray(items) ? items.slice() : [];
    const filtered = q.trim()
      ? base.filter(it =>
          it.title?.toLowerCase().includes(q.toLowerCase()) ||
          it.subtitle?.toLowerCase().includes(q.toLowerCase())
        )
      : base;

    switch (sort) {
      case "owned":
        return filtered.sort((a, b) => Number(b.owned) - Number(a.owned));
      case "title":
        return filtered.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      case "newest":
      default:
        return filtered.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
  }, [items, q, sort]);

  const openCert = useCallback(async (item: Collectible) => {
    Haptics.selection().catch(() => {});
    router.push(
      `/modals/CertificateModal?name=${encodeURIComponent("Nova Student")}&course=${encodeURIComponent(
        item.title
      )}&level=${encodeURIComponent(String(item.rarity || "1"))}`
    );
  }, [router]);

  const doToggleOwned = useCallback(async (id: string) => {
    Haptics.selection().catch(() => {});
    if (typeof toggleOwned === "function") {
      try {
        await toggleOwned(id);
      } catch {}
    }
  }, [toggleOwned]);

  const goShop = useCallback(() => {
    Haptics.selection().catch(() => {});
    notify("Opening shop…", "Commerce");
    router.push("/(tabs)/shop");
  }, [router, notify]);

  const renderItem = useCallback(
    ({ item }: { item: Collectible }) => (
      <Pressable
        onPress={() => openCert(item)}
        onLongPress={() => doToggleOwned(item.id)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <Image source={item.icon || Images.bunny} style={styles.icon} />
        <Text style={styles.title}>{item.title}</Text>
        {!!item.subtitle && <Text style={styles.subtitle}>{item.subtitle}</Text>}
        <View style={styles.row}>
          <RarityPill rarity={item.rarity} />
          {item.owned ? (
            <View style={[styles.pill, styles.owned]}>
              <Text style={[styles.pillText, { color: "#9FFFBF" }]}>OWNED</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    ),
    [openCert, doToggleOwned]
  );

  return (
    <ScreenBG>
      <HeaderBar
        title="Your Collection"
        subtitle="Badges & Rewards"
        showBack={false}
        right={
          <Pressable
            onPress={goShop}
            style={({ pressed }) => [styles.shopBtn, pressed && styles.pressed]}
          >
            <Text style={styles.shopText}>Shop</Text>
          </Pressable>
        }
      />

      <View style={styles.controls}>
        <View style={styles.searchWrap}>
          <TextInput
            placeholder="Search badges…"
            placeholderTextColor="#7FA1B7"
            value={q}
            onChangeText={setQ}
            style={styles.input}
          />
        </View>

        <View style={styles.sortRow}>
          {(["newest", "owned", "title"] as SortKey[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setSort(key)}
              style={[
                styles.sortChip,
                sort === key && styles.sortChipActive,
              ]}
            >
              <Text
                style={[
                  styles.sortText,
                  sort === key && styles.sortTextActive,
                ]}
              >
                {key.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.body}>
        <FlatList
          data={data}
          keyExtractor={(it) => it.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      </View>
    </ScreenBG>
  );
}

/** ---------- styles ---------- */
const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  searchWrap: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: { color: "#EAF7FF", fontWeight: "700" },
  sortRow: { flexDirection: "row", gap: 8 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  sortChipActive: {
    borderColor: "rgba(0,209,255,0.45)",
    backgroundColor: "rgba(0,209,255,0.20)",
  },
  sortText: { color: "#8AA0B3", fontWeight: "800", fontSize: 12 },
  sortTextActive: { color: "#EAFBFF" },

  body: { flex: 1, padding: 16 },
  list: { paddingBottom: 24 },

  card: {
    flex: 1,
    minHeight: 150,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  cardPressed: { opacity: 0.95, transform: [{ scale: 0.99 }] },
  icon: { width: 56, height: 56, borderRadius: 28, marginBottom: 8 },
  title: { color: "#EAF7FF", fontWeight: "900", letterSpacing: 0.3, textAlign: "center" },
  subtitle: { color: "#8AA0B3", fontSize: 12, marginTop: 4, textAlign: "center" },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },

  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  pillText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  owned: {
    borderColor: "rgba(125,255,170,0.6)",
    backgroundColor: "rgba(125,255,170,0.15)",
  },

  shopBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "rgba(0,209,255,0.20)",
    borderColor: "rgba(0,209,255,0.45)",
  },
  shopText: { color: "#EAFBFF", fontWeight: "900" },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
