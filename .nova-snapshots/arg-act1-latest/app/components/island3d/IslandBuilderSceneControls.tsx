// app/components/island3d/IslandBuilderSceneControls.tsx
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useIslandBuilder } from "../../context/IslandBuilderContext";
import { useIslandDecorations } from "../../context/IslandDecorationContext";
import { useIslandKeepsakes } from "../../context/IslandKeepsakeContext";
import { clampIslandBuildPosition } from "../../_lib/islandBuilderBounds";

type Props = { selectedPlacementId: string | null };

const MOVE_STEP = 0.3;
const ROTATE_STEP = Math.PI / 12;
const SCALE_STEP = 0.15;
const BUILDER_AZIMUTH = 0.58;

export default function IslandBuilderSceneControls({
  selectedPlacementId,
}: Props) {
  const {
    isEditing,
    catalog,
    placements,
    movePlacement: moveLandmark,
    rotatePlacement: rotateLandmark,
    scalePlacement: scaleLandmark,
    returnToInventory: returnLandmarkToInventory,
  } = useIslandBuilder();

  const decor = useIslandDecorations();
  const keepsakes = useIslandKeepsakes();
  const [open, setOpen] = useState(true);

  const landmark = useMemo(
    () =>
      placements.find(
        (p) => p.placementId === selectedPlacementId
      ) ?? null,
    [placements, selectedPlacementId]
  );

  const landmarkItem = useMemo(
    () =>
      landmark
        ? catalog.find((item) => item.id === landmark.itemId) ?? null
        : null,
    [catalog, landmark]
  );

  const decoration = useMemo(
    () =>
      decor.placements.find(
        (p) => p.placementId === decor.selectedPlacementId
      ) ?? null,
    [decor.placements, decor.selectedPlacementId]
  );

  const decorationItem = useMemo(
    () =>
      decoration
        ? decor.catalog.find((item) => item.id === decoration.itemId) ?? null
        : null,
    [decor.catalog, decoration]
  );

  const keepsake = keepsakes.selectedKeepsake;

  const usingKeepsake = Boolean(keepsake);
  const usingDecoration = !usingKeepsake && Boolean(decoration && decorationItem);

  const selected: any = usingKeepsake
    ? keepsake
    : usingDecoration
    ? decoration
    : landmark;

  const title = usingKeepsake
    ? keepsake?.title ?? "Keepsake"
    : usingDecoration
    ? decorationItem?.shortTitle ?? "Decoration"
    : landmarkItem?.shortTitle ?? "Landmark";

  if (!isEditing || !selected) return null;

  const moveScreen = (horizontal: number, vertical: number) => {
    const rightX = Math.cos(BUILDER_AZIMUTH);
    const rightZ = -Math.sin(BUILDER_AZIMUTH);
    const downX = Math.sin(BUILDER_AZIMUTH);
    const downZ = Math.cos(BUILDER_AZIMUTH);

    const dx = (horizontal * rightX + vertical * downX) * MOVE_STEP;
    const dz = (horizontal * rightZ + vertical * downZ) * MOVE_STEP;

    const next = clampIslandBuildPosition(
      selected.transform.x + dx,
      selected.transform.z + dz,
      selected.transform.scale,
      usingKeepsake ? selected.key : selected.itemId
    );

    if (usingKeepsake) {
      keepsakes.moveKeepsake(selected.key, {
        x: next.x,
        z: next.z,
      });
    } else if (usingDecoration) {
      decor.movePlacement(selected.placementId, {
        x: next.x,
        z: next.z,
      });
    } else {
      moveLandmark(selected.placementId, {
        x: next.x,
        z: next.z,
      });
    }
  };

  const rotate = (delta: number) => {
    const next = selected.transform.rotationY + delta;

    if (usingKeepsake) {
      keepsakes.rotateKeepsake(selected.key, next);
    } else if (usingDecoration) {
      decor.rotatePlacement(selected.placementId, next);
    } else {
      rotateLandmark(selected.placementId, next);
    }
  };

  const resize = (delta: number) => {
    const minScale = usingDecoration
      ? decorationItem?.minScale ?? 0.5
      : 0.5;
    const maxScale = usingDecoration
      ? decorationItem?.maxScale ?? 4
      : 4;

    const scale = Math.max(
      minScale,
      Math.min(maxScale, selected.transform.scale + delta)
    );

    const next = clampIslandBuildPosition(
      selected.transform.x,
      selected.transform.z,
      scale,
      usingKeepsake ? selected.key : selected.itemId
    );

    if (usingKeepsake) {
      keepsakes.moveKeepsake(selected.key, {
        x: next.x,
        z: next.z,
      });
      keepsakes.scaleKeepsake(selected.key, scale);
    } else if (usingDecoration) {
      decor.movePlacement(selected.placementId, {
        x: next.x,
        z: next.z,
      });
      decor.scalePlacement(selected.placementId, scale);
    } else {
      moveLandmark(selected.placementId, {
        x: next.x,
        z: next.z,
      });
      scaleLandmark(selected.placementId, scale);
    }
  };

  const moveToInventory = () => {
    if (usingKeepsake) {
      keepsakes.returnToInventory(selected.key);
    } else if (usingDecoration) {
      decor.returnToInventory(selected.placementId);
    } else {
      returnLandmarkToInventory(selected.placementId);
    }
  };

  const button = (
    icon: string,
    label: string,
    onPress: () => void,
    danger = false
  ) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tool,
        danger && styles.danger,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={icon as any}
        size={14}
        color={danger ? "#fecaca" : "#e0f2fe"}
      />
      <Text style={[styles.toolText, danger && styles.dangerText]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>
              {usingKeepsake
                ? "KEEPSAKE SELECTED"
                : usingDecoration
                ? "DECORATION SELECTED"
                : "LANDMARK SELECTED"}
            </Text>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            <Text style={styles.hint}>
              Tap once to select. Drag only after it is selected.
            </Text>
          </View>
          <Pressable
            onPress={() => setOpen((value) => !value)}
            style={styles.collapse}
          >
            <Ionicons
              name={open ? "remove" : "add"}
              size={17}
              color="#cbd5e1"
            />
          </Pressable>
        </View>

        {open ? (
          <>
            <View style={styles.controls}>
              <View style={styles.dpad}>
                <View style={styles.dpadRow}>
                  <View style={styles.spacer} />
                  {button("chevron-up", "Back", () => moveScreen(0, -1))}
                  <View style={styles.spacer} />
                </View>
                <View style={styles.dpadRow}>
                  {button("chevron-back", "Left", () => moveScreen(-1, 0))}
                  <View style={styles.center}>
                    <Ionicons
                      name="move-outline"
                      size={17}
                      color="#67e8f9"
                    />
                  </View>
                  {button("chevron-forward", "Right", () => moveScreen(1, 0))}
                </View>
                <View style={styles.dpadRow}>
                  <View style={styles.spacer} />
                  {button("chevron-down", "Forward", () => moveScreen(0, 1))}
                  <View style={styles.spacer} />
                </View>
              </View>

              <View style={styles.transforms}>
                {button("arrow-undo-outline", "Rotate", () =>
                  rotate(-ROTATE_STEP)
                )}
                {button("arrow-redo-outline", "Rotate", () =>
                  rotate(ROTATE_STEP)
                )}
                {button("remove", "Smaller", () => resize(-SCALE_STEP))}
                {button("add", "Larger", () => resize(SCALE_STEP))}
              </View>
            </View>

            {button(
              "archive-outline",
              "Move to inventory",
              moveToInventory,
              true
            )}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    zIndex: 50,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 410,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.42)",
    backgroundColor: "rgba(2,6,23,0.84)",
    padding: 8,
    gap: 7,
  },
  header: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eyebrow: {
    color: "#67e8f9",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    marginTop: 1,
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "900",
  },
  hint: {
    marginTop: 1,
    color: "#64748b",
    fontSize: 8,
  },
  collapse: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
    backgroundColor: "rgba(15,23,42,0.72)",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dpad: {
    width: 168,
    gap: 4,
  },
  dpadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  spacer: {
    width: 52,
    height: 40,
  },
  center: {
    width: 52,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34,211,238,0.06)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.12)",
  },
  transforms: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    justifyContent: "flex-end",
  },
  tool: {
    minWidth: 52,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.22)",
    backgroundColor: "rgba(15,43,68,0.82)",
    paddingHorizontal: 5,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  toolText: {
    color: "#dbeafe",
    fontSize: 7,
    fontWeight: "800",
  },
  danger: {
    borderColor: "rgba(248,113,113,0.25)",
    backgroundColor: "rgba(127,29,29,0.18)",
  },
  dangerText: {
    color: "#fecaca",
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
});
