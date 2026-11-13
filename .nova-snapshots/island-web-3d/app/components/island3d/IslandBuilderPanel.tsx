// app/components/island3d/IslandBuilderPanel.tsx
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useIslandBuilder } from "../../context/IslandBuilderContext";
import { useIslandDecorations } from "../../context/IslandDecorationContext";
import IslandDecorationShopPanel from "./IslandDecorationShopPanel";
import { useIslandKeepsakes } from "../../context/IslandKeepsakeContext";
import IslandKeepsakeInventoryPanel from "./IslandKeepsakeInventoryPanel";

type Props = {
  selectedPlacementId: string | null;
  onSelectPlacement: (placementId: string | null) => void;
};

function SmallButton({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallButton,
        danger && styles.dangerButton,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={icon as any}
        size={15}
        color={danger ? "#fecaca" : "#dbeafe"}
      />
      <Text
        style={[
          styles.smallButtonText,
          danger && styles.dangerText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DismissibleTip({
  icon,
  text,
  onClose,
}: {
  icon: string;
  text: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.tip}>
      <Ionicons
        name={icon as any}
        size={16}
        color="#7dd3fc"
      />
      <Text style={styles.tipText}>
        {text}
      </Text>
      <Pressable
        onPress={onClose}
        hitSlop={10}
        style={styles.tipClose}
      >
        <Ionicons
          name="close"
          size={16}
          color="#94a3b8"
        />
      </Pressable>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  open,
  onToggle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.sectionHeader,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.sectionHeaderIcon}>
        <Ionicons
          name={icon as any}
          size={17}
          color="#67e8f9"
        />
      </View>

      <View style={styles.sectionHeaderCopy}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.sectionSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.collapseButton}>
        <Ionicons
          name={open ? "remove" : "add"}
          size={18}
          color="#cbd5e1"
        />
      </View>
    </Pressable>
  );
}

export default function IslandBuilderPanel({
  selectedPlacementId,
  onSelectPlacement,
}: Props) {
  const {
    ready,
    isEditing,
    catalog,
    placements,
    startEditing,
    cancelEditing,
    saveEditing,
    placeItem,
    returnToInventory,
    resetDraftToDefaultLayout,
    getInventoryCount,
  } = useIslandBuilder();

  const {
    startEditing: startDecorationEditing,
    cancelEditing: cancelDecorationEditing,
    saveEditing: saveDecorationEditing,
    selectPlacement: selectDecorationPlacement,
  } = useIslandDecorations();

  const {
    startEditing: startKeepsakeEditing,
    cancelEditing: cancelKeepsakeEditing,
    saveEditing: saveKeepsakeEditing,
    selectKeepsake,
  } = useIslandKeepsakes();

  const [saving, setSaving] =
    useState(false);
  const [panelOpen, setPanelOpen] =
    useState(true);
  const [selectionOpen, setSelectionOpen] =
    useState(false);
  const [inventoryOpen, setInventoryOpen] =
    useState(false);
  const [showClosedTip, setShowClosedTip] =
    useState(true);
  const [showBuildTip, setShowBuildTip] =
    useState(true);
  const [
    showSelectionTip,
    setShowSelectionTip,
  ] = useState(true);
  const [
    showInventoryTip,
    setShowInventoryTip,
  ] = useState(true);

  const selected = useMemo(
    () =>
      placements.find(
        (placement) =>
          placement.placementId ===
          selectedPlacementId
      ) ?? null,
    [
      placements,
      selectedPlacementId,
    ]
  );

  const selectedItem = useMemo(
    () =>
      selected
        ? catalog.find(
            (item) =>
              item.id ===
              selected.itemId
          ) ?? null
        : null,
    [catalog, selected]
  );

  const inventoryItems = useMemo(
    () =>
      catalog.filter(
        (item) =>
          getInventoryCount(
            item.id
          ) > 0
      ),
    [
      catalog,
      getInventoryCount,
    ]
  );

  const save = async () => {
    if (saving) return;

    setSaving(true);

    try {
      const keepsakeSaved =
        await saveKeepsakeEditing();
      const decorationSaved =
        await saveDecorationEditing();
      const landmarkSaved =
        await saveEditing();

      if (
        keepsakeSaved &&
        decorationSaved &&
        landmarkSaved
      ) {
        onSelectPlacement(null);
        selectDecorationPlacement(null);
        selectKeepsake(null);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <View style={styles.closed}>
        <View style={styles.closedTop}>
          <View style={styles.closedCopy}>
            <View style={styles.badge}>
              <Ionicons
                name="construct-outline"
                size={14}
                color="#67e8f9"
              />
              <Text style={styles.badgeText}>
                ISLAND BUILDER
              </Text>
            </View>

            <Text style={styles.title}>
              Customize Nova Island
            </Text>
          </View>

          <Pressable
            onPress={() => {
              if (!ready) return;
              onSelectPlacement(null);
              startEditing();
              startDecorationEditing();
              startKeepsakeEditing();
            }}
            disabled={!ready}
            style={({ pressed }) => [
              styles.build,
              !ready && styles.disabled,
              pressed &&
                ready &&
                styles.pressed,
            ]}
          >
            <Ionicons
              name="hammer-outline"
              size={18}
              color="#020617"
            />
            <Text style={styles.buildText}>
              {ready
                ? "BUILD"
                : "LOADING…"}
            </Text>
          </Pressable>
        </View>

        {showClosedTip ? (
          <DismissibleTip
            icon="information-circle-outline"
            text="Build mode lets you drag landmarks, resize them, rotate them, and manage your island layout."
            onClose={() =>
              setShowClosedTip(false)
            }
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.editor}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.badge}>
            <Ionicons
              name="construct-outline"
              size={14}
              color="#67e8f9"
            />
            <Text style={styles.badgeText}>
              BUILD MODE
            </Text>
          </View>

          <Text style={styles.editorTitle}>
            Island Builder
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() =>
              setPanelOpen(
                (value) => !value
              )
            }
            style={({ pressed }) => [
              styles.iconAction,
              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              name={
                panelOpen
                  ? "remove"
                  : "add"
              }
              size={18}
              color="#cbd5e1"
            />
          </Pressable>

          <Pressable
            onPress={() => {
              onSelectPlacement(null);
              cancelEditing();
              cancelDecorationEditing();
              cancelKeepsakeEditing();
              selectDecorationPlacement(null);
              selectKeepsake(null);
            }}
            disabled={saving}
            style={({ pressed }) => [
              styles.cancel,
              saving &&
                styles.disabled,
              pressed &&
                !saving &&
                styles.pressed,
            ]}
          >
            <Text style={styles.cancelText}>
              CANCEL
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              void save()
            }
            disabled={saving}
            style={({ pressed }) => [
              styles.save,
              saving &&
                styles.disabled,
              pressed &&
                !saving &&
                styles.pressed,
            ]}
          >
            <Ionicons
              name="checkmark"
              size={16}
              color="#020617"
            />
            <Text style={styles.saveText}>
              {saving
                ? "SAVING…"
                : "SAVE"}
            </Text>
          </Pressable>
        </View>
      </View>

      {panelOpen ? (
        <>
          {showBuildTip ? (
            <DismissibleTip
              icon="hand-left-outline"
              text="Use the controls directly over the island while you edit. Drag a landmark for larger moves; drag empty land to move the view."
              onClose={() =>
                setShowBuildTip(false)
              }
            />
          ) : null}

          <View style={styles.sectionCard}>
            <SectionHeader
              icon="locate-outline"
              title={
                selectedItem
                  ? selectedItem.title
                  : "Selected landmark"
              }
              subtitle={
                selected
                  ? `X ${selected.transform.x.toFixed(
                      2
                    )} · Z ${selected.transform.z.toFixed(
                      2
                    )} · ${selected.transform.scale.toFixed(
                      1
                    )}×`
                  : "Nothing selected"
              }
              open={selectionOpen}
              onToggle={() =>
                setSelectionOpen(
                  (value) =>
                    !value
                )
              }
            />

            {selectionOpen ? (
              <View style={styles.sectionBody}>
                {showSelectionTip ? (
                  <DismissibleTip
                    icon="move-outline"
                    text="Tap a landmark in the 3D view. Its movement, rotation, and size controls stay over the island so you can watch every adjustment."
                    onClose={() =>
                      setShowSelectionTip(
                        false
                      )
                    }
                  />
                ) : null}

                {selected &&
                selectedItem ? (
                  <SmallButton
                    icon="archive-outline"
                    label="Return landmark to inventory"
                    danger
                    onPress={() => {
                      if (
                        returnToInventory(
                          selected.placementId
                        )
                      ) {
                        onSelectPlacement(
                          null
                        );
                      }
                    }}
                  />
                ) : (
                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Tap an unlocked
                    landmark on the
                    island to select it.
                  </Text>
                )}
              </View>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <SectionHeader
              icon="cube-outline"
              title="Inventory"
              subtitle={`${inventoryItems.length} item type${
                inventoryItems.length ===
                1
                  ? ""
                  : "s"
              } waiting`}
              open={inventoryOpen}
              onToggle={() =>
                setInventoryOpen(
                  (value) =>
                    !value
                )
              }
            />

            {inventoryOpen ? (
              <View style={styles.sectionBody}>
                {showInventoryTip ? (
                  <DismissibleTip
                    icon="sparkles-outline"
                    text="Stored and newly unlocked landmarks appear here. You can keep this box collapsed whenever you do not need it."
                    onClose={() =>
                      setShowInventoryTip(
                        false
                      )
                    }
                  />
                ) : null}

                <Pressable
                  onPress={() => {
                    if (
                      resetDraftToDefaultLayout()
                    ) {
                      onSelectPlacement(
                        null
                      );
                    }
                  }}
                  style={({
                    pressed,
                  }) => [
                    styles.reset,
                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={14}
                    color="#c4b5fd"
                  />
                  <Text
                    style={
                      styles.resetText
                    }
                  >
                    RESET DEFAULT
                  </Text>
                </Pressable>

                {inventoryItems.length ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                    contentContainerStyle={
                      styles.inventory
                    }
                  >
                    {inventoryItems.map(
                      (item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            const id =
                              placeItem(
                                item.id
                              );

                            if (id) {
                              onSelectPlacement(
                                id
                              );
                            }
                          }}
                          style={({
                            pressed,
                          }) => [
                            styles.inventoryItem,
                            pressed &&
                              styles.pressed,
                          ]}
                        >
                          <Ionicons
                            name={
                              item.icon as any
                            }
                            size={20}
                            color="#67e8f9"
                          />
                          <Text
                            style={
                              styles.inventoryTitle
                            }
                          >
                            {
                              item.shortTitle
                            }
                          </Text>
                          <Text
                            style={
                              styles.inventoryCount
                            }
                          >
                            ×
                            {getInventoryCount(
                              item.id
                            )}
                          </Text>
                          <Text
                            style={
                              styles.placeText
                            }
                          >
                            PLACE
                          </Text>
                        </Pressable>
                      )
                    )}
                  </ScrollView>
                ) : (
                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Everything you own
                    is currently placed.
                  </Text>
                )}
              </View>
            ) : null}
          </View>

          <IslandDecorationShopPanel />
          <IslandKeepsakeInventoryPanel />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  closed: {
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor:
      "rgba(34,211,238,0.38)",
    backgroundColor:
      "rgba(6,20,39,0.94)",
    padding: 14,
    gap: 10,
  },
  closedTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  closedCopy: {
    flex: 1,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor:
      "rgba(8,145,178,0.14)",
    borderWidth: 1,
    borderColor:
      "rgba(34,211,238,0.28)",
  },
  badgeText: {
    color: "#67e8f9",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 7,
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
  },
  editorTitle: {
    marginTop: 7,
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
  },
  build: {
    minWidth: 88,
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#67e8f9",
  },
  buildText: {
    color: "#020617",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  editor: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor:
      "rgba(103,232,249,0.42)",
    backgroundColor:
      "rgba(3,15,30,0.96)",
    padding: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor:
      "rgba(148,163,184,0.28)",
    backgroundColor:
      "rgba(15,23,42,0.72)",
  },
  cancel: {
    minHeight: 36,
    borderRadius: 11,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor:
      "rgba(148,163,184,0.30)",
    backgroundColor:
      "rgba(15,23,42,0.72)",
  },
  cancelText: {
    color: "#cbd5e1",
    fontSize: 9,
    fontWeight: "900",
  },
  save: {
    minHeight: 36,
    borderRadius: 11,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#67e8f9",
  },
  saveText: {
    color: "#020617",
    fontSize: 9,
    fontWeight: "900",
  },
  tip: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor:
      "rgba(125,211,252,0.18)",
    backgroundColor:
      "rgba(15,43,68,0.54)",
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  tipText: {
    flex: 1,
    color: "#bae6fd",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
  },
  tipClose: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCard: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor:
      "rgba(56,189,248,0.18)",
    backgroundColor:
      "rgba(8,28,52,0.66)",
    overflow: "hidden",
  },
  sectionHeader: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sectionHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(34,211,238,0.08)",
  },
  sectionHeaderCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "900",
  },
  sectionSubtitle: {
    marginTop: 2,
    color: "#64748b",
    fontSize: 9,
    fontWeight: "700",
  },
  collapseButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor:
      "rgba(148,163,184,0.18)",
    backgroundColor:
      "rgba(15,23,42,0.54)",
  },
  sectionBody: {
    borderTopWidth: 1,
    borderTopColor:
      "rgba(56,189,248,0.12)",
    padding: 10,
    gap: 9,
  },
  smallButton: {
    minHeight: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor:
      "rgba(125,211,252,0.22)",
    backgroundColor:
      "rgba(15,43,68,0.78)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  smallButtonText: {
    color: "#dbeafe",
    fontSize: 10,
    fontWeight: "800",
  },
  dangerButton: {
    borderColor:
      "rgba(248,113,113,0.26)",
    backgroundColor:
      "rgba(127,29,29,0.16)",
  },
  dangerText: {
    color: "#fecaca",
  },
  reset: {
    alignSelf: "flex-start",
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor:
      "rgba(196,181,253,0.22)",
    backgroundColor:
      "rgba(76,29,149,0.12)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  resetText: {
    color: "#c4b5fd",
    fontSize: 9,
    fontWeight: "900",
  },
  inventory: {
    gap: 8,
    paddingRight: 8,
  },
  inventoryItem: {
    width: 106,
    minHeight: 96,
    borderRadius: 13,
    borderWidth: 1,
    borderColor:
      "rgba(34,211,238,0.18)",
    backgroundColor:
      "rgba(8,28,52,0.72)",
    padding: 9,
  },
  inventoryTitle: {
    marginTop: 6,
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "900",
  },
  inventoryCount: {
    marginTop: 2,
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "700",
  },
  placeText: {
    marginTop: 5,
    color: "#67e8f9",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 10,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.72,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },
  disabled: {
    opacity: 0.45,
  },
});
