// app/components/island3d/NovaIsland3DScene.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  Canvas,
  useFrame,
  useThree,
} from "@react-three/fiber/native";
import * as THREE from "three";

import {
  ISLAND_MILESTONES,
  type IslandMilestone,
} from "../../context/IslandContext";
import {
  useIslandBuilder,
  type IslandPlacement,
} from "../../context/IslandBuilderContext";
import { useIslandDecorations } from "../../context/IslandDecorationContext";
import { useIslandKeepsakes } from "../../context/IslandKeepsakeContext";
import IslandDecorationLayer from "./IslandDecorationLayer";
import {
  clampIslandBuildPosition,
} from "../../_lib/islandBuilderBounds";
import {
  ISLAND_DECORATION_CATALOG_BY_ID,
} from "../../_lib/islandDecorationCatalog";

import LegendarySatelliteIslands, {
  getLegendaryIslandInfo,
  type LegendaryIslandId,
  type LegendaryIslandInfo,
} from "./LegendarySatelliteIslands";

export type Island3DZone =
  | "grove"
  | "garden"
  | "library"
  | "waterfall"
  | "observatory"
  | "habitat"
  | "open_grass";

export type Island3DDiscovery = {
  key: string;
  kind: "keepsake" | "resident";
  title: string;
  accent: string;
  zone: Island3DZone;

  /*
   * Preserved for the resident-model registry.
   * Generic residents still render safely when no dedicated model exists.
   */
  companionId?: string;
};

type Props = {
  level: number;
  height?: number;
  learningPulseToken?: number;
  dailyQuestReady?: boolean;
  dailyQuestCompletedCount?: number;
  dailyQuestTotalCount?: number;
  dailyQuestClaimableCount?: number;
  dailyQuestAllComplete?: boolean;
  dailyQuestBonusClaimed?: boolean;
  dailyQuestAllClaimed?: boolean;
  dailyQuestCelebrationToken?: number;
  onOpenDailyQuests?: () => void;
  selectedMilestoneId: string;
  selectedDiscoveryKey: string | null;
  selectedDecorationPlacementId?: string | null;
  discoveries: Island3DDiscovery[];
  legendaryCompanionIds?: string[];
  builderPlacements?: IslandPlacement[];
  onSelectMilestone: (
    milestoneId: string
  ) => void;
  onSelectDiscovery: (
    discoveryKey: string
  ) => void;
  onSelectDecoration?: (
    placementId: string | null
  ) => void;
  onInteractionChange?: (
    active: boolean
  ) => void;
};

type Vec3 = [
  number,
  number,
  number
];

type NovaOverlayProjection = {
  x: number;
  y: number;
  visible: boolean;
  scale: number;
};

type OrbitControlsState = {
  azimuth: number;
  polar: number;
  distance: number;
  desiredAzimuth: number;
  desiredPolar: number;
  desiredTarget: Vec3;
  desiredDistance: number;
};

type OrbitVelocityState = {
  azimuth: number;
  polar: number;
};

type TimePalette = {
  label: string;
  skyTop: string;
  skyBottom: string;
  horizon: string;
  ambient: number;
  keyLight: number;
  fillLight: number;
  starsOpacity: number;
  celestialColor: string;
  celestialGlow: string;
  celestialPosition: Vec3;
  celestialKind: "sun" | "moon";
  cloudOpacity: number;
};

const DEFAULT_TARGET: Vec3 = [
  0,
  0.45,
  0,
];

/*
 * Polished temporary Nova Island resident.
 *
 * This is the transparent mascot rendering created specifically for the
 * Island pedestal. It remains a lightweight React Native image until the
 * final professionally modeled and rigged GLB replaces it.
 */
const NOVA_ISLAND_MASCOT_ART =
  require("../../assets/island/nova_island_placeholder.png");

/*
 * Nova's temporary sprite is projected from this genuine 3D world anchor.
 * The pedestal lives in the Canvas; only the transparent mascot artwork is
 * drawn by React Native, avoiding native Three.js texture-loader problems.
 */
const NOVA_PEDESTAL_WORLD: Vec3 = [
  -3.0,
  0.8,
  1.6,
];

const NOVA_SPRITE_BASE_WIDTH = 62;
const NOVA_SPRITE_BASE_HEIGHT = 93;

const LANDMARK_POSITIONS: Record<
  string,
  Vec3
> = {
  study_grove: [
    -4.45,
    1.08,
    -1.1,
  ],
  starlight_garden: [
    -2.95,
    0.98,
    2.8,
  ],
  nova_library: [
    0.2,
    1.12,
    -1.5,
  ],
  whisperwind_mill: [
    -2.45,
    1.08,
    -3.55,
  ],
  learning_falls: [
    3.2,
    0.82,
    2.7,
  ],
  moonwell: [
    -0.45,
    0.98,
    1.75,
  ],
  sky_observatory: [
    4.2,
    1.1,
    -1.25,
  ],
  companion_habitat: [
    1.75,
    0.94,
    -4.2,
  ],
  castle_reach: [
    -9.15,
    1.12,
    -0.95,
  ],
  starport_dock: [
    9.1,
    1.05,
    1.5,
  ],
  crystal_wilds: [
    1.5,
    1.08,
    -9.05,
  ],
  moon_temple: [
    -1.1,
    1.08,
    8.8,
  ],
};

const DISCOVERY_ZONE_POSITIONS: Record<
  Island3DZone,
  Vec3
> = {
  grove: [
    -3.55,
    1.02,
    0.7,
  ],
  garden: [
    -1.75,
    0.94,
    3.65,
  ],
  library: [
    1.0,
    1.02,
    -0.7,
  ],
  waterfall: [
    3.45,
    0.8,
    1.75,
  ],
  observatory: [
    3.55,
    1.0,
    -2.45,
  ],
  habitat: [
    0.45,
    0.92,
    -4.55,
  ],
  open_grass: [
    -0.6,
    0.96,
    1.75,
  ],
};

const EQUIPPED_VISITOR_ROUTE: Vec3[] = [
  DISCOVERY_ZONE_POSITIONS.open_grass,
  DISCOVERY_ZONE_POSITIONS.library,
  DISCOVERY_ZONE_POSITIONS.garden,
  DISCOVERY_ZONE_POSITIONS.grove,
];

const LANDMARK_LORE: Record<
  string,
  string
> = {
  study_grove:
    "The first roots of Nova Island grow wherever curiosity is practiced.",
  starlight_garden:
    "Each flower stores a tiny spark from a question you were brave enough to ask.",
  nova_library:
    "The Library remembers lessons, cards, and discoveries gathered across your journey.",
  whisperwind_mill:
    "Its turning sails gather wandering thoughts and return them as focused energy.",
  learning_falls:
    "Learning energy becomes water here, flowing more brightly as your habits strengthen.",
  moonwell:
    "The Moonwell remembers quiet wishes made beneath the stars.",
  sky_observatory:
    "The Observatory watches distant goals and turns progress into constellations.",
  companion_habitat:
    "Bonded companions find a lasting home here, even when another friend is equipped.",
  castle_reach:
    "Across the bridge, the castle guards the oldest stories of the Nova realm.",
  starport_dock:
    "The dock waits at the edge of the sky for journeys beyond the island.",
  crystal_wilds:
    "Every crystal hums with a different memory of learning and discovery.",
  moon_temple:
    "The moon gate opens only for an island that has grown through patience.",
};

const clamp = (
  value: number,
  min: number,
  max: number
) =>
  Math.max(
    min,
    Math.min(max, value)
  );

const damp = (
  current: number,
  target: number,
  smoothing: number,
  delta: number
): number => {
  const amount =
    1 -
    Math.exp(
      -smoothing * delta
    );

  return current +
    (target - current) *
      amount;
};

const distanceBetweenTouches = (
  touches: readonly any[]
): number => {
  if (touches.length < 2) {
    return 0;
  }

  const dx =
    touches[0].pageX -
    touches[1].pageX;

  const dy =
    touches[0].pageY -
    touches[1].pageY;

  return Math.sqrt(
    dx * dx + dy * dy
  );
};

function mixHex(
  a: string,
  b: string,
  amount: number
): string {
  const t = clamp(
    amount,
    0,
    1
  );

  const parse = (value: string) => {
    const normalized =
      value.replace("#", "");

    return [
      parseInt(
        normalized.slice(0, 2),
        16
      ),
      parseInt(
        normalized.slice(2, 4),
        16
      ),
      parseInt(
        normalized.slice(4, 6),
        16
      ),
    ];
  };

  const first = parse(a);
  const second = parse(b);

  const result = first.map(
    (channel, index) =>
      Math.round(
        channel +
          (second[index] -
            channel) *
            t
      )
  );

  return `#${result
    .map((channel) =>
      channel
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}

function paletteForDate(
  date: Date
): TimePalette {
  const hour =
    date.getHours() +
    date.getMinutes() / 60;

  if (hour >= 5 && hour < 8) {
    const t = (hour - 5) / 3;

    return {
      label: "Dawn",
      skyTop: mixHex(
        "#180d35",
        "#4d79ad",
        t
      ),
      skyBottom: mixHex(
        "#d56a73",
        "#9ad8ef",
        t
      ),
      horizon: "#ffd0a3",
      ambient: 0.72,
      keyLight: 1.28,
      fillLight: 0.68,
      starsOpacity:
        0.7 * (1 - t),
      celestialColor: "#ffd7a0",
      celestialGlow: "#ff9f68",
      celestialPosition: [
        -11 + t * 4,
        11.5 + t * 2.2,
        -21.5,
      ],
      celestialKind: "sun",
      cloudOpacity: 0.58,
    };
  }

  if (hour >= 8 && hour < 17) {
    const arc =
      (hour - 8) / 9;

    return {
      label: "Day",
      skyTop: "#248bdf",
      skyBottom: "#8bdcf5",
      horizon: "#d7f5ff",
      ambient: 1.02,
      keyLight: 2.2,
      fillLight: 0.82,
      starsOpacity: 0,
      celestialColor: "#fff4b0",
      celestialGlow: "#ffd84d",
      celestialPosition: [
        -11 + arc * 22,
        13 +
          Math.sin(
            arc * Math.PI
          ) *
            3.2,
        -21.5,
      ],
      celestialKind: "sun",
      cloudOpacity: 0.9,
    };
  }

  if (hour >= 17 && hour < 20) {
    const t = (hour - 17) / 3;

    return {
      label: "Sunset",
      skyTop: mixHex(
        "#3b63a6",
        "#120624",
        t
      ),
      skyBottom: mixHex(
        "#ff9f6b",
        "#5d285f",
        t
      ),
      horizon: "#ffc68a",
      ambient:
        0.84 - t * 0.22,
      keyLight:
        1.7 - t * 0.68,
      fillLight:
        0.72 - t * 0.2,
      starsOpacity:
        0.12 + t * 0.7,
      celestialColor: "#ffcb8a",
      celestialGlow: "#ff7a59",
      celestialPosition: [
        7 + t * 4,
        13 - t * 1.8,
        -21.5,
      ],
      celestialKind: "sun",
      cloudOpacity:
        0.68 - t * 0.24,
    };
  }

  const afterMidnight =
    hour < 5;

  const moonArc = afterMidnight
    ? hour / 5
    : (hour - 20) / 9;

  return {
    label: "Night",
    skyTop: "#01030b",
    skyBottom: "#081c3b",
    horizon: "#17365a",
    ambient: 0.42,
    keyLight: 0.78,
    fillLight: 0.38,
    starsOpacity: 0.95,
    celestialColor: "#e7efff",
    celestialGlow: "#8ab4ff",
    celestialPosition: [
      -11 + moonArc * 22,
      13 +
        Math.sin(
          moonArc * Math.PI
        ) *
          3,
      -22,
    ],
    celestialKind: "moon",
    cloudOpacity: 0.3,
  };
}

function CameraRig({
  controlsRef,
  velocityRef,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsState>;
  velocityRef: React.MutableRefObject<OrbitVelocityState>;
}) {
  const currentTarget =
    useRef(
      new THREE.Vector3(
        ...DEFAULT_TARGET
      )
    );

  useFrame(
    ({ camera }, delta) => {
      const controls =
        controlsRef.current;

      const velocity =
        velocityRef.current;

      /*
       * Momentum changes the desired orbit, never the camera directly.
       * The actual camera then eases toward that target, which removes the
       * small snapping/jitter that direct PanResponder updates created.
       */
      if (
        Math.abs(
          velocity.azimuth
        ) > 0.0001
      ) {
        controls.desiredAzimuth +=
          velocity.azimuth *
          delta;
      }

      if (
        Math.abs(
          velocity.polar
        ) > 0.0001
      ) {
        controls.desiredPolar =
          clamp(
            controls.desiredPolar +
              velocity.polar *
                delta,
            0.5,
            1.34
          );
      }

      const momentumDecay =
        Math.exp(
          -5.4 * delta
        );

      velocity.azimuth *=
        momentumDecay;

      velocity.polar *=
        momentumDecay;

      controls.azimuth =
        damp(
          controls.azimuth,
          controls.desiredAzimuth,
          8.2,
          delta
        );

      controls.polar =
        damp(
          controls.polar,
          controls.desiredPolar,
          8.2,
          delta
        );

      controls.distance =
        damp(
          controls.distance,
          controls.desiredDistance,
          7.4,
          delta
        );

      const desiredTarget =
        new THREE.Vector3(
          ...controls.desiredTarget
        );

      currentTarget.current.lerp(
        desiredTarget,
        1 -
          Math.exp(
            -6.8 * delta
          )
      );

      const sinPolar =
        Math.sin(
          controls.polar
        );

      const x =
        currentTarget.current.x +
        controls.distance *
          sinPolar *
          Math.sin(
            controls.azimuth
          );

      const y =
        currentTarget.current.y +
        controls.distance *
          Math.cos(
            controls.polar
          );

      const z =
        currentTarget.current.z +
        controls.distance *
          sinPolar *
          Math.cos(
            controls.azimuth
          );

      camera.position.set(
        x,
        y,
        z
      );

      camera.lookAt(
        currentTarget.current
      );

      camera.updateProjectionMatrix();
    }
  );

  return null;
}

function StarField({
  opacity,
}: {
  opacity: number;
}) {
  const group =
    useRef<THREE.Group>(
      null
    );

  const brightMaterial =
    useRef<THREE.PointsMaterial>(
      null
    );

  const softMaterial =
    useRef<THREE.PointsMaterial>(
      null
    );

  const stars = useMemo(() => {
    const bright: number[] = [];
    const soft: number[] = [];
    const band: number[] = [];

    /*
     * A deterministic dome surrounds the full scene rather than placing a
     * thin row above the island. This keeps stars visible while orbiting.
     */
    for (
      let index = 0;
      index < 360;
      index += 1
    ) {
      const theta =
        ((index * 137.508) %
          360) *
        (Math.PI / 180);

      const normalized =
        ((index * 73) % 997) /
        997;

      const phi =
        0.13 +
        normalized * 1.25;

      const radius =
        19 +
        ((index * 31) % 10);

      const x =
        Math.cos(theta) *
        Math.sin(phi) *
        radius;

      const y =
        Math.cos(phi) *
          radius +
        2.5;

      const z =
        Math.sin(theta) *
          Math.sin(phi) *
          radius -
        3;

      const target =
        index % 5 === 0
          ? bright
          : soft;

      target.push(
        x,
        y,
        z
      );
    }

    // A faint diagonal galaxy band gives the night sky depth.
    for (
      let index = 0;
      index < 130;
      index += 1
    ) {
      const t =
        index / 129;

      const angle =
        -1.3 +
        t * Math.PI * 2.6;

      const radius =
        21 +
        ((index * 19) % 5);

      const spread =
        (((index * 47) % 100) /
          100 -
          0.5) *
        3.4;

      band.push(
        Math.cos(angle) *
          radius,
        7.8 +
          Math.sin(angle * 0.55) *
            5.8 +
          spread,
        Math.sin(angle) *
          radius -
          5
      );
    }

    return {
      bright:
        new Float32Array(
          bright
        ),
      soft:
        new Float32Array(
          soft
        ),
      band:
        new Float32Array(
          band
        ),
    };
  }, []);

  useFrame(
    ({ clock }, delta) => {
      if (group.current) {
        group.current.rotation.y +=
          delta * 0.003;
      }

      const twinkle =
        0.82 +
        Math.sin(
          clock.elapsedTime *
            1.7
        ) *
          0.18;

      if (
        brightMaterial.current
      ) {
        brightMaterial.current.opacity =
          opacity * twinkle;
      }

      if (
        softMaterial.current
      ) {
        softMaterial.current.opacity =
          opacity * 0.72;
      }
    }
  );

  if (opacity <= 0.01) {
    return null;
  }

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              stars.soft,
              3,
            ]}
          />
        </bufferGeometry>

        <pointsMaterial
          ref={softMaterial}
          color="#dbeafe"
          size={0.095}
          transparent
          opacity={
            opacity * 0.72
          }
          sizeAttenuation
          depthWrite={false}
          fog={false}
        />
      </points>

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              stars.bright,
              3,
            ]}
          />
        </bufferGeometry>

        <pointsMaterial
          ref={brightMaterial}
          color="#ffffff"
          size={0.16}
          transparent
          opacity={opacity}
          sizeAttenuation
          depthWrite={false}
          fog={false}
        />
      </points>

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              stars.band,
              3,
            ]}
          />
        </bufferGeometry>

        <pointsMaterial
          color="#c4b5fd"
          size={0.12}
          transparent
          opacity={
            opacity * 0.34
          }
          sizeAttenuation
          depthWrite={false}
          fog={false}
        />
      </points>
    </group>
  );
}

function DetailedMoon({
  palette,
}: {
  palette: TimePalette;
}) {
  const halo =
    useRef<THREE.Mesh>(
      null
    );

  useFrame(
    ({ clock }) => {
      if (!halo.current) {
        return;
      }

      const pulse =
        1.72 +
        Math.sin(
          clock.elapsedTime *
            0.8
        ) *
          0.06;

      halo.current.scale.set(
        pulse,
        pulse,
        pulse
      );
    }
  );

  return (
    <group
      position={
        palette.celestialPosition
      }
      scale={1.18}
    >
      <pointLight
        color="#dbeafe"
        intensity={1.8}
        distance={24}
      />

      <mesh>
        <sphereGeometry
          args={[
            0.68,
            36,
            30,
          ]}
        />
        <meshStandardMaterial
          color="#f2f5ff"
          emissive="#dbeafe"
          emissiveIntensity={0.72}
          roughness={0.72}
          fog={false}
        />
      </mesh>

      {[
        [-0.2, 0.2, 0.628, 0.13],
        [0.23, 0.1, 0.63, 0.1],
        [0.08, -0.24, 0.632, 0.15],
        [-0.3, -0.17, 0.625, 0.075],
        [0.3, -0.27, 0.615, 0.065],
      ].map(
        ([
          x,
          y,
          z,
          size,
        ], index) => (
          <mesh
            key={index}
            position={[
              x,
              y,
              z,
            ]}
            scale={[
              size,
              size * 0.62,
              0.025,
            ]}
          >
            <sphereGeometry
              args={[
                1,
                16,
                12,
              ]}
            />
            <meshBasicMaterial
              color="#aeb8cf"
              transparent
              opacity={0.48}
              fog={false}
            />
          </mesh>
        )
      )}

      <mesh
        ref={halo}
        scale={1.72}
      >
        <sphereGeometry
          args={[
            0.68,
            22,
            18,
          ]}
        />
        <meshBasicMaterial
          color="#9ec5ff"
          transparent
          opacity={0.16}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      <mesh scale={2.35}>
        <sphereGeometry
          args={[
            0.68,
            20,
            16,
          ]}
        />
        <meshBasicMaterial
          color="#dbeafe"
          transparent
          opacity={0.055}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}

function DetailedSun({
  palette,
}: {
  palette: TimePalette;
}) {
  const corona =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }, delta) => {
      if (corona.current) {
        corona.current.rotation.z +=
          delta * 0.06;

        const pulse =
          1 +
          Math.sin(
            clock.elapsedTime *
              1.1
          ) *
            0.025;

        corona.current.scale.set(
          pulse,
          pulse,
          pulse
        );
      }
    }
  );

  return (
    <group
      position={
        palette.celestialPosition
      }
      scale={1.14}
    >
      <pointLight
        color="#fff4b0"
        intensity={2.5}
        distance={30}
      />

      <mesh>
        <sphereGeometry
          args={[
            0.72,
            34,
            28,
          ]}
        />
        <meshBasicMaterial
          color="#fffbd0"
          fog={false}
        />
      </mesh>

      <mesh scale={1.38}>
        <sphereGeometry
          args={[
            0.72,
            24,
            20,
          ]}
        />
        <meshBasicMaterial
          color="#ffd84d"
          transparent
          opacity={0.3}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      <group ref={corona}>
        {[0, 1, 2].map(
          (ring) => (
            <mesh
              key={ring}
              rotation={[
                Math.PI / 2,
                ring * 0.62,
                ring * 0.4,
              ]}
              scale={
                1.62 +
                ring * 0.28
              }
            >
              <torusGeometry
                args={[
                  0.72,
                  0.035,
                  8,
                  42,
                ]}
              />
              <meshBasicMaterial
                color={
                  ring === 0
                    ? "#fff7b2"
                    : "#ffd166"
                }
                transparent
                opacity={
                  0.24 -
                  ring * 0.045
                }
                depthWrite={false}
                fog={false}
              />
            </mesh>
          )
        )}
      </group>

      <mesh scale={2.6}>
        <sphereGeometry
          args={[
            0.72,
            20,
            16,
          ]}
        />
        <meshBasicMaterial
          color="#fff3a3"
          transparent
          opacity={0.07}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}

function CelestialBody({
  palette,
}: {
  palette: TimePalette;
}) {
  return palette.celestialKind ===
    "moon" ? (
    <DetailedMoon
      palette={palette}
    />
  ) : (
    <DetailedSun
      palette={palette}
    />
  );
}

function Cloud({
  startX,
  y,
  z,
  speed,
  scale,
  opacity,
}: {
  startX: number;
  y: number;
  z: number;
  speed: number;
  scale: number;
  opacity: number;
}) {
  const ref =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    (_, delta) => {
      if (!ref.current) {
        return;
      }

      ref.current.position.x +=
        speed * delta;

      if (
        ref.current.position.x >
        17
      ) {
        ref.current.position.x =
          -17;
      }
    }
  );

  return (
    <group
      ref={ref}
      position={[
        startX,
        y,
        z,
      ]}
      scale={scale}
    >
      {[
        [-1.12, -0.04, 0.02, 0.78],
        [-0.55, 0.18, 0, 1.02],
        [0.05, 0.34, 0, 1.16],
        [0.76, 0.16, 0.03, 0.96],
        [1.34, -0.04, 0, 0.72],
        [-0.05, -0.18, 0.08, 1.05],
      ].map(
        ([
          x,
          cloudY,
          cloudZ,
          size,
        ], index) => (
          <mesh
            key={index}
            position={[
              x,
              cloudY,
              cloudZ,
            ]}
            scale={[
              size,
              size * 0.72,
              size * 0.82,
            ]}
          >
            <sphereGeometry
              args={[
                0.78,
                16,
                12,
              ]}
            />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#dff6ff"
              emissiveIntensity={0.12}
              transparent
              opacity={opacity}
              roughness={1}
              depthWrite={false}
              fog={false}
            />
          </mesh>
        )
      )}
    </group>
  );
}

function IslandBase({
  onDeselect,
}: {
  onDeselect?: () => void;
}) {
  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onDeselect?.();
      }}
    >
      <mesh
        position={[
          0,
          0.15,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            30,
            29.3,
            1.08,
            112,
          ]}
        />
        <meshStandardMaterial
          color="#3ba86c"
          roughness={0.92}
        />
      </mesh>

      {/* A deep brown floating-earth mountain hangs beneath the green land. */}
      <mesh
        position={[
          0,
          -8.25,
          0,
        ]}
        rotation={[
          Math.PI,
          0,
          0,
        ]}
      >
        <coneGeometry
          args={[
            29.3,
            17.8,
            72,
          ]}
        />
        <meshStandardMaterial
          color="#6b4938"
          roughness={1}
          flatShading
        />
      </mesh>

      <mesh
        position={[
          0,
          -9.05,
          0,
        ]}
        rotation={[
          Math.PI,
          0.18,
          0,
        ]}
        scale={[
          0.82,
          1.06,
          0.82,
        ]}
      >
        <coneGeometry
          args={[
            25.2,
            15.0,
            56,
          ]}
        />
        <meshStandardMaterial
          color="#4f352c"
          roughness={1}
          flatShading
        />
      </mesh>

      {[
        [-7.4, -4.8, 3.4, 0.38, 1.08],
        [6.7, -5.0, 4.1, 0.34, 1.0],
        [-4.6, -5.25, -6.1, 0.32, 0.94],
        [5.5, -4.9, -5.4, 0.35, 0.98],
        [0.2, -7.2, 7.2, 0.22, 0.8],
        [-0.8, -7.45, -7.0, 0.24, 0.76],
      ].map(
        ([
          x,
          y,
          z,
          width,
          height,
        ], index) => (
          <mesh
            key={`floating-rock-rib-${index}`}
            position={[
              x,
              y,
              z,
            ]}
            rotation={[
              Math.PI,
              index * 0.48,
              0,
            ]}
            scale={[
              width,
              height,
              width,
            ]}
          >
            <coneGeometry
              args={[
                8.2,
                8.4,
                10,
              ]}
            />
            <meshStandardMaterial
              color={
                index % 2
                  ? "#5b3d30"
                  : "#76513d"
              }
              roughness={1}
              flatShading
            />
          </mesh>
        )
      )}
    </group>
  );
}

type IslandExpansionProps = {
  level: number;
  requiredLevel: number;
  center: Vec3;
  scale: Vec3;
  connectorPosition: Vec3;
  connectorScale: Vec3;
  grassColor: string;
  stoneColor: string;
};

function IslandExpansion({
  level,
  requiredLevel,
  center,
  scale,
  connectorPosition,
  connectorScale,
  grassColor,
  stoneColor,
}: IslandExpansionProps) {
  const group =
    useRef<THREE.Group>(
      null
    );

  const growth =
    useRef(
      level >= requiredLevel
        ? 0.04
        : 0
    );

  useFrame(
    (_, delta) => {
      if (!group.current) {
        return;
      }

      growth.current =
        damp(
          growth.current,
          1,
          3.4,
          delta
        );

      const value =
        Math.max(
          0.04,
          growth.current
        );

      group.current.scale.set(
        value,
        value,
        value
      );

      group.current.position.y =
        center[1] -
        (1 - value) *
          1.5;
    }
  );

  if (level < requiredLevel) {
    return null;
  }

  return (
    <group
      ref={group}
      position={center}
      scale={[
        0.04,
        0.04,
        0.04,
      ]}
    >
      <mesh
        position={[
          0,
          0.12,
          0,
        ]}
        scale={scale}
      >
        <cylinderGeometry
          args={[
            2.15,
            1.95,
            0.9,
            34,
          ]}
        />
        <meshStandardMaterial
          color={grassColor}
          roughness={0.9}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.64,
          0,
        ]}
        scale={scale}
      >
        <cylinderGeometry
          args={[
            2.06,
            2.12,
            0.18,
            34,
          ]}
        />
        <meshStandardMaterial
          color="#7ce39c"
          roughness={0.86}
        />
      </mesh>

      <mesh
        position={[
          0,
          -1.82,
          0,
        ]}
        rotation={[
          Math.PI,
          0,
          0,
        ]}
        scale={[
          scale[0],
          1,
          scale[2],
        ]}
      >
        <coneGeometry
          args={[
            1.95,
            4.1,
            30,
          ]}
        />
        <meshStandardMaterial
          color={stoneColor}
          roughness={1}
        />
      </mesh>

      <mesh
        position={[
          connectorPosition[0] -
            center[0],
          connectorPosition[1] -
            center[1],
          connectorPosition[2] -
            center[2],
        ]}
        scale={connectorScale}
      >
        <boxGeometry
          args={[
            1,
            1,
            1,
          ]}
        />
        <meshStandardMaterial
          color="#59bd75"
          roughness={0.9}
        />
      </mesh>

      {[
        [-1.25, -0.25, 0.9],
        [1.05, -0.38, -0.8],
        [0.35, -0.52, 1.25],
      ].map(
        (position, index) => (
          <mesh
            key={index}
            position={
              position as Vec3
            }
            rotation={[
              Math.PI,
              index * 0.7,
              0,
            ]}
            scale={[
              0.24,
              0.24,
              0.24,
            ]}
          >
            <coneGeometry
              args={[
                1.1,
                2.2,
                10,
              ]}
            />
            <meshStandardMaterial
              color={stoneColor}
              roughness={1}
            />
          </mesh>
        )
      )}
    </group>
  );
}

function IslandExpansions({
  level,
}: {
  level: number;
}) {
  return (
    <>
      <IslandExpansion
        level={level}
        requiredLevel={12}
        center={[
          -9.0,
          0.08,
          -0.9,
        ]}
        scale={[
          1.12,
          1,
          0.94,
        ]}
        connectorPosition={[
          -7.0,
          0.57,
          -0.8,
        ]}
        connectorScale={[
          4.0,
          0.34,
          1.35,
        ]}
        grassColor="#3ba86c"
        stoneColor="#604137"
      />

      <IslandExpansion
        level={level}
        requiredLevel={15}
        center={[
          8.9,
          0.04,
          1.45,
        ]}
        scale={[
          1.12,
          1,
          0.92,
        ]}
        connectorPosition={[
          6.9,
          0.56,
          1.15,
        ]}
        connectorScale={[
          4.0,
          0.34,
          1.28,
        ]}
        grassColor="#3ba86c"
        stoneColor="#594039"
      />

      <IslandExpansion
        level={level}
        requiredLevel={18}
        center={[
          1.45,
          0.08,
          -8.9,
        ]}
        scale={[
          0.98,
          1,
          1.12,
        ]}
        connectorPosition={[
          1.05,
          0.58,
          -6.9,
        ]}
        connectorScale={[
          1.32,
          0.34,
          4.05,
        ]}
        grassColor="#3ba86c"
        stoneColor="#564039"
      />

      <IslandExpansion
        level={level}
        requiredLevel={21}
        center={[
          -1.05,
          0.08,
          8.65,
        ]}
        scale={[
          1.02,
          1,
          1.14,
        ]}
        connectorPosition={[
          -0.72,
          0.58,
          6.7,
        ]}
        connectorScale={[
          1.38,
          0.34,
          3.95,
        ]}
        grassColor="#3ba86c"
        stoneColor="#62443a"
      />
    </>
  );
}

function SelectionRing({
  color,
}: {
  color: string;
}) {
  const ref =
    useRef<THREE.Mesh>(
      null
    );

  useFrame(
    ({ clock }) => {
      if (!ref.current) {
        return;
      }

      const pulse =
        1 +
        Math.sin(
          clock.elapsedTime * 3.2
        ) *
          0.08;

      ref.current.scale.set(
        pulse,
        pulse,
        pulse
      );

      ref.current.rotation.z +=
        0.006;
    }
  );

  return (
    <mesh
      ref={ref}
      position={[
        0,
        -0.05,
        0,
      ]}
      rotation={[
        -Math.PI / 2,
        0,
        0,
      ]}
    >
      <torusGeometry
        args={[
          0.78,
          0.055,
          10,
          42,
        ]}
      />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.88}
        depthWrite={false}
      />
    </mesh>
  );
}

function Tree({
  unlocked,
}: {
  unlocked: boolean;
}) {
  const leafColor = unlocked
    ? "#53c878"
    : "#46505d";

  const trunkColor = unlocked
    ? "#855a3d"
    : "#3c4149";

  return (
    <group>
      <mesh
        position={[
          0,
          0.65,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.18,
            0.25,
            1.3,
            10,
          ]}
        />
        <meshStandardMaterial
          color={trunkColor}
          roughness={1}
        />
      </mesh>

      {[
        [0, 1.55, 0, 0.78],
        [-0.52, 1.35, 0, 0.58],
        [0.5, 1.35, 0.08, 0.62],
        [0.05, 1.42, -0.48, 0.56],
      ].map(
        ([
          x,
          y,
          z,
          size,
        ], index) => (
          <mesh
            key={index}
            position={[
              x,
              y,
              z,
            ]}
            scale={size}
          >
            <sphereGeometry
              args={[
                0.82,
                14,
                12,
              ]}
            />
            <meshStandardMaterial
              color={leafColor}
              roughness={0.9}
              emissive={
                unlocked
                  ? "#0b3d24"
                  : "#000000"
              }
              emissiveIntensity={
                unlocked
                  ? 0.35
                  : 0
              }
            />
          </mesh>
        )
      )}
    </group>
  );
}

function Garden({
  unlocked,
}: {
  unlocked: boolean;
}) {
  const colors = unlocked
    ? [
        "#f0abfc",
        "#67e8f9",
        "#fde68a",
        "#86efac",
        "#fda4af",
      ]
    : [
        "#525866",
        "#525866",
        "#525866",
        "#525866",
        "#525866",
      ];

  return (
    <group>
      {[
        [-0.55, 0, -0.2],
        [-0.15, 0.04, 0.28],
        [0.28, 0, -0.12],
        [0.6, 0.02, 0.3],
        [0.1, 0.05, 0.62],
      ].map(
        ([
          x,
          y,
          z,
        ], index) => (
          <group
            key={index}
            position={[
              x,
              y,
              z,
            ]}
          >
            <mesh
              position={[
                0,
                0.25,
                0,
              ]}
            >
              <cylinderGeometry
                args={[
                  0.025,
                  0.035,
                  0.5,
                  7,
                ]}
              />
              <meshStandardMaterial
                color={
                  unlocked
                    ? "#3f9b63"
                    : "#424852"
                }
              />
            </mesh>

            <mesh
              position={[
                0,
                0.55,
                0,
              ]}
            >
              <octahedronGeometry
                args={[
                  0.18,
                  0,
                ]}
              />
              <meshStandardMaterial
                color={
                  colors[index]
                }
                emissive={
                  colors[index]
                }
                emissiveIntensity={
                  unlocked
                    ? 0.65
                    : 0
                }
              />
            </mesh>
          </group>
        )
      )}
    </group>
  );
}

function Library({
  unlocked,
}: {
  unlocked: boolean;
}) {
  const floatingPages =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }) => {
      if (!floatingPages.current) {
        return;
      }

      floatingPages.current.rotation.y =
        clock.elapsedTime * 0.22;

      floatingPages.current.position.y =
        1.94 +
        Math.sin(
          clock.elapsedTime * 1.35
        ) *
          0.045;
    }
  );

  const stone = unlocked
    ? "#d8c9a7"
    : "#535963";

  const stoneDark = unlocked
    ? "#b9a984"
    : "#454b55";

  const trim = unlocked
    ? "#e8ddc4"
    : "#626a76";

  const roof = unlocked
    ? "#425f86"
    : "#3e434b";

  const wood = unlocked
    ? "#5a3829"
    : "#34383f";

  const window = unlocked
    ? "#7de7ff"
    : "#424852";

  const windowGlow = unlocked
    ? "#38bdf8"
    : "#000000";

  const gold = unlocked
    ? "#f6d66f"
    : "#5c6169";

  const bookColors = unlocked
    ? [
        "#f87171",
        "#60a5fa",
        "#fbbf24",
        "#a78bfa",
        "#34d399",
        "#fb7185",
      ]
    : [
        "#50555e",
        "#50555e",
        "#50555e",
        "#50555e",
        "#50555e",
        "#50555e",
      ];

  return (
    <group scale={0.92}>
      {/* Broad stone foundation makes the landmark read as civic architecture. */}
      <mesh
        position={[
          0,
          0.08,
          0,
        ]}
      >
        <boxGeometry
          args={[
            2.55,
            0.18,
            1.72,
          ]}
        />
        <meshStandardMaterial
          color={stoneDark}
          roughness={0.88}
        />
      </mesh>

      {/* Main reading hall. */}
      <mesh
        position={[
          0,
          0.82,
          -0.03,
        ]}
      >
        <boxGeometry
          args={[
            1.55,
            1.36,
            1.34,
          ]}
        />
        <meshStandardMaterial
          color={stone}
          roughness={0.82}
        />
      </mesh>

      {/* Side archive wings keep it from looking like a small house. */}
      {[-1.02, 1.02].map(
        (x, index) => (
          <group
            key={`wing-${index}`}
            position={[
              x,
              0,
              0.02,
            ]}
          >
            <mesh
              position={[
                0,
                0.68,
                0,
              ]}
            >
              <boxGeometry
                args={[
                  0.58,
                  1.08,
                  1.18,
                ]}
              />
              <meshStandardMaterial
                color={stone}
                roughness={0.84}
              />
            </mesh>

            <mesh
              position={[
                0,
                1.26,
                0,
              ]}
            >
              <boxGeometry
                args={[
                  0.7,
                  0.16,
                  1.32,
                ]}
              />
              <meshStandardMaterial
                color={roof}
                roughness={0.72}
              />
            </mesh>

            {/* Tall illuminated archive window. */}
            <mesh
              position={[
                0,
                0.78,
                0.61,
              ]}
            >
              <boxGeometry
                args={[
                  0.34,
                  0.56,
                  0.045,
                ]}
              />
              <meshStandardMaterial
                color={window}
                emissive={windowGlow}
                emissiveIntensity={
                  unlocked ? 0.5 : 0
                }
              />
            </mesh>

            <mesh
              position={[
                0,
                0.78,
                0.64,
              ]}
            >
              <boxGeometry
                args={[
                  0.035,
                  0.57,
                  0.025,
                ]}
              />
              <meshStandardMaterial
                color={trim}
              />
            </mesh>

            {[-0.18, 0, 0.18].map(
              (offset, shelfIndex) => (
                <mesh
                  key={`shelf-${shelfIndex}`}
                  position={[
                    0,
                    0.78 + offset,
                    0.645,
                  ]}
                >
                  <boxGeometry
                    args={[
                      0.36,
                      0.025,
                      0.025,
                    ]}
                  />
                  <meshStandardMaterial
                    color={wood}
                  />
                </mesh>
              )
            )}
          </group>
        )
      )}

      {/* Flat civic roof and raised central archive tower. */}
      <mesh
        position={[
          0,
          1.54,
          -0.03,
        ]}
      >
        <boxGeometry
          args={[
            1.78,
            0.18,
            1.5,
          ]}
        />
        <meshStandardMaterial
          color={roof}
          roughness={0.7}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.78,
          -0.08,
        ]}
      >
        <boxGeometry
          args={[
            0.9,
            0.34,
            0.92,
          ]}
        />
        <meshStandardMaterial
          color={stone}
          roughness={0.8}
        />
      </mesh>

      <mesh
        position={[
          0,
          2.0,
          -0.08,
        ]}
      >
        <boxGeometry
          args={[
            1.02,
            0.12,
            1.02,
          ]}
        />
        <meshStandardMaterial
          color={roof}
          roughness={0.7}
        />
      </mesh>

      {/* Grand front portico. */}
      <mesh
        position={[
          0,
          1.36,
          0.74,
        ]}
      >
        <boxGeometry
          args={[
            1.42,
            0.16,
            0.18,
          ]}
        />
        <meshStandardMaterial
          color={trim}
          roughness={0.72}
        />
      </mesh>

      {[
        -0.56,
        -0.2,
        0.2,
        0.56,
      ].map((x, index) => (
        <group
          key={`column-${index}`}
          position={[
            x,
            0,
            0.76,
          ]}
        >
          <mesh
            position={[
              0,
              0.72,
              0,
            ]}
          >
            <cylinderGeometry
              args={[
                0.075,
                0.09,
                1.18,
                12,
              ]}
            />
            <meshStandardMaterial
              color={trim}
              roughness={0.7}
            />
          </mesh>

          <mesh
            position={[
              0,
              0.12,
              0,
            ]}
          >
            <cylinderGeometry
              args={[
                0.12,
                0.12,
                0.1,
                12,
              ]}
            />
            <meshStandardMaterial
              color={stoneDark}
            />
          </mesh>

          <mesh
            position={[
              0,
              1.34,
              0,
            ]}
          >
            <cylinderGeometry
              args={[
                0.12,
                0.1,
                0.1,
                12,
              ]}
            />
            <meshStandardMaterial
              color={stoneDark}
            />
          </mesh>
        </group>
      ))}

      {/* Wide double doors and glowing arch. */}
      {[-0.17, 0.17].map(
        (x, index) => (
          <mesh
            key={`door-${index}`}
            position={[
              x,
              0.48,
              0.69,
            ]}
          >
            <boxGeometry
              args={[
                0.3,
                0.72,
                0.075,
              ]}
            />
            <meshStandardMaterial
              color={wood}
              roughness={0.66}
            />
          </mesh>
        )
      )}

      <mesh
        position={[
          0,
          0.84,
          0.705,
        ]}
      >
        <torusGeometry
          args={[
            0.34,
            0.055,
            8,
            28,
            Math.PI,
          ]}
        />
        <meshStandardMaterial
          color={gold}
          emissive={
            unlocked
              ? "#b98b22"
              : "#000000"
          }
          emissiveIntensity={
            unlocked ? 0.45 : 0
          }
          metalness={0.28}
          roughness={0.4}
        />
      </mesh>

      {/* Three broad entrance steps. */}
      {[
        [0.82, 0.06, 0.96],
        [0.68, 0.12, 0.86],
        [0.54, 0.18, 0.76],
      ].map(
        ([
          width,
          y,
          z,
        ], index) => (
          <mesh
            key={`step-${index}`}
            position={[
              0,
              y,
              z,
            ]}
          >
            <boxGeometry
              args={[
                width,
                0.1,
                0.28,
              ]}
            />
            <meshStandardMaterial
              color={
                index === 0
                  ? stoneDark
                  : trim
              }
              roughness={0.84}
            />
          </mesh>
        )
      )}

      {/* Open-book crest above the entrance. */}
      <group
        position={[
          0,
          1.66,
          0.78,
        ]}
      >
        <mesh
          position={[
            -0.13,
            0,
            0,
          ]}
          rotation={[
            0,
            0,
            -0.2,
          ]}
        >
          <boxGeometry
            args={[
              0.26,
              0.18,
              0.045,
            ]}
          />
          <meshStandardMaterial
            color="#f8f1d4"
            emissive={
              unlocked
                ? "#f6d66f"
                : "#000000"
            }
            emissiveIntensity={
              unlocked ? 0.28 : 0
            }
          />
        </mesh>

        <mesh
          position={[
            0.13,
            0,
            0,
          ]}
          rotation={[
            0,
            0,
            0.2,
          ]}
        >
          <boxGeometry
            args={[
              0.26,
              0.18,
              0.045,
            ]}
          />
          <meshStandardMaterial
            color="#f8f1d4"
            emissive={
              unlocked
                ? "#f6d66f"
                : "#000000"
            }
            emissiveIntensity={
              unlocked ? 0.28 : 0
            }
          />
        </mesh>

        <mesh
          position={[
            0,
            -0.02,
            0.025,
          ]}
        >
          <boxGeometry
            args={[
              0.025,
              0.2,
              0.035,
            ]}
          />
          <meshStandardMaterial
            color={gold}
          />
        </mesh>
      </group>

      {/* Exterior book displays make the purpose obvious even from a distance. */}
      {[-0.98, 0.98].map(
        (x, sideIndex) => (
          <group
            key={`bookcase-${sideIndex}`}
            position={[
              x,
              0.4,
              0.66,
            ]}
          >
            <mesh>
              <boxGeometry
                args={[
                  0.42,
                  0.55,
                  0.08,
                ]}
              />
              <meshStandardMaterial
                color={wood}
                roughness={0.72}
              />
            </mesh>

            {bookColors.map(
              (color, bookIndex) => {
                const column =
                  bookIndex % 3;

                const row =
                  Math.floor(
                    bookIndex / 3
                  );

                return (
                  <mesh
                    key={bookIndex}
                    position={[
                      -0.12 +
                        column *
                          0.12,
                      -0.12 +
                        row *
                          0.25,
                      0.055,
                    ]}
                    scale={[
                      1,
                      0.82 +
                        (bookIndex %
                          2) *
                          0.18,
                      1,
                    ]}
                  >
                    <boxGeometry
                      args={[
                        0.075,
                        0.18,
                        0.035,
                      ]}
                    />
                    <meshStandardMaterial
                      color={color}
                      emissive={
                        unlocked
                          ? color
                          : "#000000"
                      }
                      emissiveIntensity={
                        unlocked
                          ? 0.12
                          : 0
                      }
                    />
                  </mesh>
                );
              }
            )}
          </group>
        )
      )}

      {/* Warm reading lamps. */}
      {[-0.78, 0.78].map(
        (x, index) => (
          <group
            key={`lamp-${index}`}
            position={[
              x,
              0.96,
              0.78,
            ]}
          >
            <mesh>
              <sphereGeometry
                args={[
                  0.085,
                  12,
                  10,
                ]}
              />
              <meshStandardMaterial
                color="#fff4bd"
                emissive={
                  unlocked
                    ? "#fbbf24"
                    : "#000000"
                }
                emissiveIntensity={
                  unlocked ? 1.1 : 0
                }
              />
            </mesh>

            {unlocked ? (
              <pointLight
                color="#ffd76a"
                intensity={0.45}
                distance={2.2}
              />
            ) : null}
          </group>
        )
      )}

      {/* A few enchanted pages orbit the roof after unlock. */}
      {unlocked ? (
        <group
          ref={floatingPages}
          position={[
            0,
            1.94,
            -0.04,
          ]}
        >
          {[
            [0.46, 0.08, 0],
            [-0.34, 0.16, 0.28],
            [0.12, -0.02, -0.44],
          ].map(
            ([
              x,
              y,
              z,
            ], index) => (
              <mesh
                key={`page-${index}`}
                position={[
                  x,
                  y,
                  z,
                ]}
                rotation={[
                  0.2 +
                    index * 0.2,
                  index * 0.9,
                  -0.22 +
                    index * 0.18,
                ]}
              >
                <boxGeometry
                  args={[
                    0.16,
                    0.11,
                    0.012,
                  ]}
                />
                <meshStandardMaterial
                  color="#fff8dc"
                  emissive="#fde68a"
                  emissiveIntensity={0.42}
                  side={
                    THREE.DoubleSide
                  }
                />
              </mesh>
            )
          )}
        </group>
      ) : null}
    </group>
  );
}

function Waterfall({
  unlocked,
}: {
  unlocked: boolean;
}) {
  const ref =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }) => {
      if (!ref.current) {
        return;
      }

      ref.current.position.y =
        Math.sin(
          clock.elapsedTime * 2.8
        ) *
        0.035;
    }
  );

  return (
    <group>
      <mesh
        position={[
          0,
          0.18,
          -0.25,
        ]}
      >
        <boxGeometry
          args={[
            1.45,
            0.55,
            1.15,
          ]}
        />
        <meshStandardMaterial
          color={
            unlocked
              ? "#546a66"
              : "#454b52"
          }
          roughness={1}
        />
      </mesh>

      <group
        ref={ref}
        position={[
          0,
          0.2,
          0.56,
        ]}
      >
        {[
          [-0.35, 0.34],
          [0, 0.42],
          [0.35, 0.3],
        ].map(
          ([
            x,
            height,
          ], index) => (
            <mesh
              key={index}
              position={[
                x,
                -0.28,
                0,
              ]}
            >
              <boxGeometry
                args={[
                  0.28,
                  1.25 +
                    height,
                  0.08,
                ]}
              />
              <meshStandardMaterial
                color={
                  unlocked
                    ? "#7ddcff"
                    : "#56616a"
                }
                transparent
                opacity={
                  unlocked
                    ? 0.74
                    : 0.38
                }
                emissive={
                  unlocked
                    ? "#1fa8e3"
                    : "#000000"
                }
                emissiveIntensity={
                  unlocked
                    ? 0.56
                    : 0
                }
              />
            </mesh>
          )
        )}
      </group>

      <mesh
        position={[
          0,
          -1.02,
          0.62,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <circleGeometry
          args={[
            0.86,
            28,
          ]}
        />
        <meshBasicMaterial
          color={
            unlocked
              ? "#6edcff"
              : "#4f5963"
          }
          transparent
          opacity={
            unlocked
              ? 0.66
              : 0.28
          }
        />
      </mesh>
    </group>
  );
}

function Observatory({
  unlocked,
}: {
  unlocked: boolean;
}) {
  const telescope =
    useRef<THREE.Group>(
      null
    );
  const starRing =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }, delta) => {
      if (telescope.current) {
        telescope.current.rotation.y +=
          delta * 0.08;
        telescope.current.rotation.x =
          -0.48 +
          Math.sin(
            clock.elapsedTime *
              0.45
          ) *
            0.08;
      }

      if (starRing.current) {
        starRing.current.rotation.y +=
          delta * 0.18;
        starRing.current.position.y =
          2.05 +
          Math.sin(
            clock.elapsedTime *
              1.1
          ) *
            0.04;
      }
    }
  );

  const stone = unlocked
    ? "#c8d5df"
    : "#505761";
  const stoneDark = unlocked
    ? "#73869a"
    : "#3f454e";
  const metal = unlocked
    ? "#58708c"
    : "#454b54";
  const glass = unlocked
    ? "#8de8ff"
    : "#4b535e";
  const glow = unlocked
    ? "#38bdf8"
    : "#000000";
  const gold = unlocked
    ? "#f6d66f"
    : "#60656d";

  return (
    <group scale={0.9}>
      {/* Raised circular terrace. */}
      {[1.38, 1.16, 0.94].map(
        (radius, index) => (
          <mesh
            key={`terrace-${index}`}
            position={[
              0,
              0.08 +
                index * 0.09,
              0,
            ]}
          >
            <cylinderGeometry
              args={[
                radius,
                radius,
                0.16,
                32,
              ]}
            />
            <meshStandardMaterial
              color={
                index === 0
                  ? stoneDark
                  : stone
              }
              roughness={0.78}
            />
          </mesh>
        )
      )}

      {/* Observatory tower. */}
      <mesh
        position={[
          0,
          0.94,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.72,
            0.86,
            1.42,
            24,
          ]}
        />
        <meshStandardMaterial
          color={stone}
          roughness={0.74}
        />
      </mesh>

      {/* Tall arched windows. */}
      {[
        0,
        Math.PI / 2,
        Math.PI,
        -Math.PI / 2,
      ].map((angle, index) => (
        <group
          key={`window-${index}`}
          rotation={[
            0,
            angle,
            0,
          ]}
        >
          <mesh
            position={[
              0,
              0.98,
              0.755,
            ]}
          >
            <boxGeometry
              args={[
                0.28,
                0.48,
                0.035,
              ]}
            />
            <meshStandardMaterial
              color={glass}
              emissive={glow}
              emissiveIntensity={
                unlocked
                  ? 0.52
                  : 0
              }
            />
          </mesh>

          <mesh
            position={[
              0,
              1.22,
              0.755,
            ]}
          >
            <circleGeometry
              args={[
                0.14,
                18,
                0,
                Math.PI,
              ]}
            />
            <meshStandardMaterial
              color={glass}
              emissive={glow}
              emissiveIntensity={
                unlocked
                  ? 0.52
                  : 0
              }
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {/* Observation balcony. */}
      <mesh
        position={[
          0,
          1.48,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.95,
            0.95,
            0.14,
            32,
          ]}
        />
        <meshStandardMaterial
          color={metal}
          metalness={0.32}
          roughness={0.48}
        />
      </mesh>

      {Array.from({ length: 12 }).map(
        (_, index) => {
          const angle =
            (index / 12) *
            Math.PI *
            2;
          return (
            <mesh
              key={`rail-${index}`}
              position={[
                Math.sin(angle) *
                  0.88,
                1.67,
                Math.cos(angle) *
                  0.88,
              ]}
            >
              <cylinderGeometry
                args={[
                  0.025,
                  0.025,
                  0.35,
                  8,
                ]}
              />
              <meshStandardMaterial
                color={gold}
                metalness={0.6}
                roughness={0.32}
              />
            </mesh>
          );
        }
      )}

      {/* Ribbed dome. */}
      <mesh
        position={[
          0,
          1.75,
          0,
        ]}
        rotation={[
          Math.PI,
          0,
          0,
        ]}
      >
        <sphereGeometry
          args={[
            0.78,
            32,
            18,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ]}
        />
        <meshStandardMaterial
          color={metal}
          metalness={0.42}
          roughness={0.34}
        />
      </mesh>

      {Array.from({ length: 8 }).map(
        (_, index) => (
          <mesh
            key={`dome-rib-${index}`}
            position={[
              0,
              1.76,
              0,
            ]}
            rotation={[
              0,
              (index / 8) *
                Math.PI *
                2,
              0,
            ]}
          >
            <torusGeometry
              args={[
                0.79,
                0.02,
                6,
                34,
                Math.PI,
              ]}
            />
            <meshStandardMaterial
              color={gold}
              metalness={0.7}
              roughness={0.28}
            />
          </mesh>
        )
      )}

      {/* Articulated telescope. */}
      <group
        ref={telescope}
        position={[
          0,
          1.82,
          0,
        ]}
      >
        <mesh
          rotation={[
            0,
            0,
            Math.PI / 2,
          ]}
        >
          <cylinderGeometry
            args={[
              0.16,
              0.22,
              1.16,
              18,
            ]}
          />
          <meshStandardMaterial
            color="#26384d"
            metalness={0.65}
            roughness={0.28}
          />
        </mesh>

        <mesh
          position={[
            0.61,
            0,
            0,
          ]}
          rotation={[
            0,
            0,
            Math.PI / 2,
          ]}
        >
          <cylinderGeometry
            args={[
              0.23,
              0.23,
              0.12,
              18,
            ]}
          />
          <meshStandardMaterial
            color={gold}
            metalness={0.72}
            roughness={0.25}
          />
        </mesh>

        <mesh
          position={[
            0.68,
            0,
            0,
          ]}
          rotation={[
            0,
            0,
            Math.PI / 2,
          ]}
        >
          <circleGeometry
            args={[
              0.18,
              22,
            ]}
          />
          <meshStandardMaterial
            color={glass}
            emissive={glow}
            emissiveIntensity={
              unlocked ? 0.75 : 0
            }
          />
        </mesh>

        <mesh
          position={[
            0,
            -0.58,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.06,
              0.09,
              0.9,
              10,
            ]}
          />
          <meshStandardMaterial
            color={metal}
            metalness={0.5}
          />
        </mesh>
      </group>

      {/* Floating constellation ring. */}
      {unlocked ? (
        <group
          ref={starRing}
          position={[
            0,
            2.05,
            0,
          ]}
        >
          {Array.from({ length: 7 }).map(
            (_, index) => {
              const angle =
                (index / 7) *
                Math.PI *
                2;
              return (
                <mesh
                  key={`star-${index}`}
                  position={[
                    Math.sin(angle) *
                      1.06,
                    Math.sin(
                      angle * 2
                    ) *
                      0.12,
                    Math.cos(angle) *
                      1.06,
                  ]}
                >
                  <sphereGeometry
                    args={[
                      0.045,
                      10,
                      8,
                    ]}
                  />
                  <meshStandardMaterial
                    color="#f8fafc"
                    emissive="#7dd3fc"
                    emissiveIntensity={1.2}
                  />
                </mesh>
              );
            }
          )}
        </group>
      ) : null}
    </group>
  );
}

function Habitat({
  unlocked,
}: {
  unlocked: boolean;
}) {
  const lanternRing =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }, delta) => {
      if (!lanternRing.current) {
        return;
      }

      lanternRing.current.rotation.y +=
        delta * 0.12;
      lanternRing.current.position.y =
        1.72 +
        Math.sin(
          clock.elapsedTime *
            1.2
        ) *
          0.035;
    }
  );

  const stone = unlocked
    ? "#cbbce8"
    : "#525861";
  const stoneDark = unlocked
    ? "#7c6a9d"
    : "#40464f";
  const wood = unlocked
    ? "#6b4634"
    : "#393e45";
  const canopy = unlocked
    ? "#7c5ce2"
    : "#474d56";
  const glow = unlocked
    ? "#c084fc"
    : "#000000";
  const mint = unlocked
    ? "#6ee7b7"
    : "#555b64";

  return (
    <group scale={0.92}>
      {/* Circular sanctuary terrace. */}
      <mesh
        position={[
          0,
          0.08,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            1.45,
            1.58,
            0.18,
            32,
          ]}
        />
        <meshStandardMaterial
          color={stoneDark}
          roughness={0.8}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.22,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            1.25,
            1.35,
            0.14,
            32,
          ]}
        />
        <meshStandardMaterial
          color={stone}
          roughness={0.76}
        />
      </mesh>

      {/* Open pavilion columns. */}
      {Array.from({ length: 8 }).map(
        (_, index) => {
          const angle =
            (index / 8) *
            Math.PI *
            2;
          return (
            <group
              key={`pillar-${index}`}
              position={[
                Math.sin(angle) *
                  1.04,
                0,
                Math.cos(angle) *
                  1.04,
              ]}
            >
              <mesh
                position={[
                  0,
                  0.84,
                  0,
                ]}
              >
                <cylinderGeometry
                  args={[
                    0.07,
                    0.09,
                    1.22,
                    12,
                  ]}
                />
                <meshStandardMaterial
                  color={wood}
                  roughness={0.66}
                />
              </mesh>

              <mesh
                position={[
                  0,
                  1.46,
                  0,
                ]}
              >
                <sphereGeometry
                  args={[
                    0.11,
                    12,
                    10,
                  ]}
                />
                <meshStandardMaterial
                  color={mint}
                  emissive={
                    unlocked
                      ? "#34d399"
                      : "#000000"
                  }
                  emissiveIntensity={
                    unlocked ? 0.45 : 0
                  }
                />
              </mesh>
            </group>
          );
        }
      )}

      {/* Layered magical canopy. */}
      <mesh
        position={[
          0,
          1.55,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            1.28,
            1.42,
            0.18,
            32,
          ]}
        />
        <meshStandardMaterial
          color={canopy}
          metalness={0.18}
          roughness={0.5}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.73,
          0,
        ]}
        rotation={[
          Math.PI,
          0,
          0,
        ]}
      >
        <sphereGeometry
          args={[
            1.02,
            28,
            14,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ]}
        />
        <meshStandardMaterial
          color={canopy}
          emissive={glow}
          emissiveIntensity={
            unlocked ? 0.12 : 0
          }
          roughness={0.44}
        />
      </mesh>

      {/* Central friendship tree. */}
      <mesh
        position={[
          0,
          0.72,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.12,
            0.18,
            0.86,
            12,
          ]}
        />
        <meshStandardMaterial
          color={wood}
          roughness={0.78}
        />
      </mesh>

      {[
        [-0.34, 1.05, 0.02],
        [0.34, 1.08, 0],
        [0, 1.25, -0.2],
        [0, 1.2, 0.28],
      ].map((position, index) => (
        <mesh
          key={`canopy-cluster-${index}`}
          position={position as Vec3}
        >
          <sphereGeometry
            args={[
              index === 2
                ? 0.36
                : 0.3,
              16,
              12,
            ]}
          />
          <meshStandardMaterial
            color={
              unlocked
                ? index % 2 === 0
                  ? "#6ee7b7"
                  : "#86efac"
                : "#545a63"
            }
            emissive={
              unlocked
                ? "#34d399"
                : "#000000"
            }
            emissiveIntensity={
              unlocked ? 0.12 : 0
            }
            roughness={0.75}
          />
        </mesh>
      ))}

      {/* Cozy companion beds around the sanctuary. */}
      {[
        [-0.7, 0.34, 0.42],
        [0.72, 0.34, 0.38],
        [-0.56, 0.34, -0.55],
        [0.58, 0.34, -0.58],
      ].map((position, index) => (
        <group
          key={`bed-${index}`}
          position={position as Vec3}
          rotation={[
            0,
            index * 0.72,
            0,
          ]}
        >
          <mesh>
            <cylinderGeometry
              args={[
                0.27,
                0.29,
                0.08,
                20,
              ]}
            />
            <meshStandardMaterial
              color={
                unlocked
                  ? index % 2 === 0
                    ? "#f0abfc"
                    : "#93c5fd"
                  : "#565c65"
              }
              roughness={0.86}
            />
          </mesh>

          <mesh
            position={[
              0,
              0.07,
              0,
            ]}
          >
            <torusGeometry
              args={[
                0.19,
                0.05,
                8,
                20,
              ]}
            />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.9}
            />
          </mesh>
        </group>
      ))}

      {/* Paw crest. */}
      <group
        position={[
          0,
          1.74,
          1.02,
        ]}
      >
        <mesh>
          <sphereGeometry
            args={[
              0.13,
              14,
              12,
            ]}
          />
          <meshStandardMaterial
            color="#f8fafc"
            emissive={glow}
            emissiveIntensity={
              unlocked ? 0.7 : 0
            }
          />
        </mesh>
        {[-0.16, -0.055, 0.055, 0.16].map(
          (x, index) => (
            <mesh
              key={`toe-${index}`}
              position={[
                x,
                0.14 +
                  Math.abs(x) *
                    0.12,
                0,
              ]}
            >
              <sphereGeometry
                args={[
                  0.055,
                  10,
                  8,
                ]}
              />
              <meshStandardMaterial
                color="#f8fafc"
                emissive={glow}
                emissiveIntensity={
                  unlocked ? 0.7 : 0
                }
              />
            </mesh>
          )
        )}
      </group>

      {/* Orbiting sanctuary lanterns. */}
      {unlocked ? (
        <group
          ref={lanternRing}
          position={[
            0,
            1.72,
            0,
          ]}
        >
          {Array.from({ length: 6 }).map(
            (_, index) => {
              const angle =
                (index / 6) *
                Math.PI *
                2;
              return (
                <mesh
                  key={`lantern-${index}`}
                  position={[
                    Math.sin(angle) *
                      1.42,
                    Math.sin(
                      angle * 2
                    ) *
                      0.08,
                    Math.cos(angle) *
                      1.42,
                  ]}
                >
                  <octahedronGeometry
                    args={[
                      0.075,
                      0,
                    ]}
                  />
                  <meshStandardMaterial
                    color={
                      index % 2 === 0
                        ? "#c084fc"
                        : "#6ee7b7"
                    }
                    emissive={
                      index % 2 === 0
                        ? "#a855f7"
                        : "#10b981"
                    }
                    emissiveIntensity={1.1}
                  />
                </mesh>
              );
            }
          )}
        </group>
      ) : null}
    </group>
  );
}

function Windmill() {
  const blades =
    useRef<THREE.Group>(
      null
    );
  const lantern =
    useRef<THREE.Mesh>(
      null
    );

  useFrame(
    ({ clock }, delta) => {
      if (blades.current) {
        blades.current.rotation.z -=
          delta * 0.72;
      }

      if (lantern.current) {
        const pulse =
          1 +
          Math.sin(
            clock.elapsedTime *
              2.4
          ) *
            0.08;
        lantern.current.scale.setScalar(
          pulse
        );
      }
    }
  );

  return (
    <group
      rotation={[
        0,
        -0.38,
        0,
      ]}
      scale={0.88}
    >
      {/* Stone foundation and steps. */}
      <mesh
        position={[
          0,
          0.09,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.86,
            0.98,
            0.18,
            18,
          ]}
        />
        <meshStandardMaterial
          color="#7c8490"
          roughness={0.88}
        />
      </mesh>

      {[0, 1, 2].map(
        (index) => (
          <mesh
            key={`step-${index}`}
            position={[
              0,
              0.08 +
                index * 0.07,
              0.78 +
                index * 0.1,
            ]}
          >
            <boxGeometry
              args={[
                0.52 -
                  index * 0.06,
                0.1,
                0.28,
              ]}
            />
            <meshStandardMaterial
              color="#a1a8b2"
              roughness={0.86}
            />
          </mesh>
        )
      )}

      {/* Tapered stone tower. */}
      <mesh
        position={[
          0,
          1.05,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.52,
            0.72,
            1.85,
            18,
          ]}
        />
        <meshStandardMaterial
          color="#d4c8ad"
          roughness={0.84}
        />
      </mesh>

      {/* Timber bands. */}
      {[0.38, 0.9, 1.42].map(
        (y, index) => (
          <mesh
            key={`band-${index}`}
            position={[
              0,
              y,
              0,
            ]}
          >
            <torusGeometry
              args={[
                0.64 -
                  index * 0.06,
                0.045,
                8,
                24,
              ]}
            />
            <meshStandardMaterial
              color="#6b4634"
              roughness={0.72}
            />
          </mesh>
        )
      )}

      {/* Door and windows. */}
      <mesh
        position={[
          0,
          0.52,
          0.66,
        ]}
      >
        <boxGeometry
          args={[
            0.34,
            0.58,
            0.07,
          ]}
        />
        <meshStandardMaterial
          color="#5a3829"
          roughness={0.7}
        />
      </mesh>

      {[
        [0.42, 1.08, 0.43],
        [-0.38, 1.34, 0.34],
      ].map((position, index) => (
        <group
          key={`window-${index}`}
          position={
            position as Vec3
          }
        >
          <mesh>
            <boxGeometry
              args={[
                0.2,
                0.28,
                0.06,
              ]}
            />
            <meshStandardMaterial
              color="#8de8ff"
              emissive="#38bdf8"
              emissiveIntensity={0.42}
            />
          </mesh>
          <mesh
            position={[
              0,
              0,
              0.04,
            ]}
          >
            <boxGeometry
              args={[
                0.035,
                0.29,
                0.025,
              ]}
            />
            <meshStandardMaterial
              color="#6b4634"
            />
          </mesh>
        </group>
      ))}

      {/* Wraparound balcony. */}
      <mesh
        position={[
          0,
          1.66,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.72,
            0.72,
            0.12,
            20,
          ]}
        />
        <meshStandardMaterial
          color="#6b4634"
          roughness={0.72}
        />
      </mesh>

      {Array.from({ length: 10 }).map(
        (_, index) => {
          const angle =
            (index / 10) *
            Math.PI *
            2;
          return (
            <mesh
              key={`balcony-rail-${index}`}
              position={[
                Math.sin(angle) *
                  0.66,
                1.82,
                Math.cos(angle) *
                  0.66,
              ]}
            >
              <cylinderGeometry
                args={[
                  0.022,
                  0.022,
                  0.28,
                  8,
                ]}
              />
              <meshStandardMaterial
                color="#5a3829"
              />
            </mesh>
          );
        }
      )}

      {/* Copper cap. */}
      <mesh
        position={[
          0,
          2.03,
          0,
        ]}
      >
        <coneGeometry
          args={[
            0.72,
            0.7,
            20,
          ]}
        />
        <meshStandardMaterial
          color="#47786f"
          metalness={0.25}
          roughness={0.52}
        />
      </mesh>

      {/* Detailed front blades. */}
      <group
        ref={blades}
        position={[
          0,
          1.82,
          0.72,
        ]}
      >
        <mesh>
          <cylinderGeometry
            args={[
              0.14,
              0.14,
              0.18,
              16,
            ]}
          />
          <meshStandardMaterial
            color="#f6d66f"
            metalness={0.45}
            roughness={0.4}
          />
        </mesh>

        {[0, 1, 2, 3].map(
          (index) => (
            <group
              key={`blade-${index}`}
              rotation={[
                0,
                0,
                (index *
                  Math.PI) /
                  2,
              ]}
            >
              <mesh
                position={[
                  0,
                  0.72,
                  0,
                ]}
              >
                <boxGeometry
                  args={[
                    0.11,
                    1.28,
                    0.08,
                  ]}
                />
                <meshStandardMaterial
                  color="#6b4634"
                  roughness={0.72}
                />
              </mesh>

              {[0.3, 0.58, 0.86, 1.08].map(
                (y, slatIndex) => (
                  <mesh
                    key={`slat-${slatIndex}`}
                    position={[
                      0.16,
                      y,
                      0.02,
                    ]}
                  >
                    <boxGeometry
                      args={[
                        0.34,
                        0.065,
                        0.045,
                      ]}
                    />
                    <meshStandardMaterial
                      color="#d7c39b"
                      roughness={0.8}
                    />
                  </mesh>
                )
              )}
            </group>
          )
        )}
      </group>

      {/* Workshop props. */}
      {[
        [-0.82, 0.24, 0.38],
        [0.8, 0.22, 0.3],
      ].map((position, index) => (
        <group
          key={`prop-${index}`}
          position={
            position as Vec3
          }
        >
          <mesh>
            {index === 0 ? (
              <boxGeometry
                args={[
                  0.32,
                  0.3,
                  0.32,
                ]}
              />
            ) : (
              <sphereGeometry
                args={[
                  0.2,
                  12,
                  10,
                ]}
              />
            )}
            <meshStandardMaterial
              color={
                index === 0
                  ? "#7b5238"
                  : "#c8b28d"
              }
              roughness={0.92}
            />
          </mesh>
        </group>
      ))}

      <mesh
        ref={lantern}
        position={[
          -0.48,
          1.7,
          0.58,
        ]}
      >
        <sphereGeometry
          args={[
            0.08,
            12,
            10,
          ]}
        />
        <meshStandardMaterial
          color="#fff4bd"
          emissive="#f59e0b"
          emissiveIntensity={1.05}
        />
      </mesh>
    </group>
  );
}

function Moonwell() {
  const water =
    useRef<THREE.Mesh>(
      null
    );
  const runeRing =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }, delta) => {
      if (water.current) {
        const pulse =
          1 +
          Math.sin(
            clock.elapsedTime *
              2.2
          ) *
            0.045;

        water.current.scale.set(
          pulse,
          pulse,
          pulse
        );
      }

      if (runeRing.current) {
        runeRing.current.rotation.y +=
          delta * 0.18;
        runeRing.current.position.y =
          1.48 +
          Math.sin(
            clock.elapsedTime *
              1.25
          ) *
            0.04;
      }
    }
  );

  return (
    <group scale={0.92}>
      {/* Lunar plaza. */}
      {[1.26, 1.04, 0.82].map(
        (radius, index) => (
          <mesh
            key={`step-${index}`}
            position={[
              0,
              0.07 +
                index * 0.08,
              0,
            ]}
          >
            <cylinderGeometry
              args={[
                radius,
                radius,
                0.14,
                32,
              ]}
            />
            <meshStandardMaterial
              color={
                index === 0
                  ? "#59647a"
                  : "#a9b7ca"
              }
              roughness={0.76}
            />
          </mesh>
        )
      )}

      {/* Deep carved well body. */}
      <mesh
        position={[
          0,
          0.44,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.62,
            0.72,
            0.46,
            28,
          ]}
        />
        <meshStandardMaterial
          color="#8f9db3"
          roughness={0.8}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.69,
          0,
        ]}
      >
        <torusGeometry
          args={[
            0.59,
            0.11,
            10,
            32,
          ]}
        />
        <meshStandardMaterial
          color="#d8e0eb"
          roughness={0.62}
        />
      </mesh>

      <mesh
        ref={water}
        position={[
          0,
          0.71,
          0,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <circleGeometry
          args={[
            0.5,
            32,
          ]}
        />
        <meshStandardMaterial
          color="#93c5fd"
          emissive="#7c3aed"
          emissiveIntensity={0.88}
          transparent
          opacity={0.86}
        />
      </mesh>

      {/* Crescent arch. */}
      {[-0.72, 0.72].map(
        (x, index) => (
          <group
            key={`column-${index}`}
            position={[
              x,
              0,
              0,
            ]}
          >
            <mesh
              position={[
                0,
                0.95,
                0,
              ]}
            >
              <cylinderGeometry
                args={[
                  0.085,
                  0.12,
                  1.45,
                  12,
                ]}
              />
              <meshStandardMaterial
                color="#cbd5e1"
                roughness={0.68}
              />
            </mesh>

            <mesh
              position={[
                0,
                1.67,
                0,
              ]}
            >
              <sphereGeometry
                args={[
                  0.13,
                  14,
                  12,
                ]}
              />
              <meshStandardMaterial
                color="#f8fafc"
                emissive="#c4b5fd"
                emissiveIntensity={0.8}
              />
            </mesh>
          </group>
        )
      )}

      <mesh
        position={[
          0,
          1.62,
          0,
        ]}
        rotation={[
          0,
          0,
          Math.PI / 2,
        ]}
      >
        <torusGeometry
          args={[
            0.72,
            0.075,
            10,
            34,
            Math.PI,
          ]}
        />
        <meshStandardMaterial
          color="#e2e8f0"
          emissive="#a78bfa"
          emissiveIntensity={0.35}
          metalness={0.28}
          roughness={0.45}
        />
      </mesh>

      {/* Hanging moon crystal. */}
      <group
        position={[
          0,
          1.58,
          0,
        ]}
      >
        <mesh>
          <sphereGeometry
            args={[
              0.25,
              24,
              18,
            ]}
          />
          <meshStandardMaterial
            color="#f5f3ff"
            emissive="#c4b5fd"
            emissiveIntensity={0.95}
          />
        </mesh>

        <mesh
          position={[
            0.09,
            0.04,
            0.18,
          ]}
        >
          <sphereGeometry
            args={[
              0.22,
              22,
              16,
            ]}
          />
          <meshStandardMaterial
            color="#4c3c78"
            transparent
            opacity={0.86}
          />
        </mesh>
      </group>

      {/* Floating runes around the water. */}
      <group
        ref={runeRing}
        position={[
          0,
          1.48,
          0,
        ]}
      >
        {Array.from({ length: 8 }).map(
          (_, index) => {
            const angle =
              (index / 8) *
              Math.PI *
              2;
            return (
              <mesh
                key={`rune-${index}`}
                position={[
                  Math.sin(angle) *
                    0.94,
                  Math.sin(
                    angle * 2
                  ) *
                    0.08,
                  Math.cos(angle) *
                    0.94,
                ]}
                rotation={[
                  0.2,
                  -angle,
                  index * 0.4,
                ]}
              >
                <octahedronGeometry
                  args={[
                    0.055,
                    0,
                  ]}
                />
                <meshStandardMaterial
                  color="#ddd6fe"
                  emissive="#8b5cf6"
                  emissiveIntensity={1.1}
                />
              </mesh>
            );
          }
        )}
      </group>

      {/* Offering bowls. */}
      {[-0.55, 0.55].map(
        (x, index) => (
          <group
            key={`offering-${index}`}
            position={[
              x,
              0.34,
              0.72,
            ]}
          >
            <mesh>
              <cylinderGeometry
                args={[
                  0.15,
                  0.1,
                  0.11,
                  16,
                ]}
              />
              <meshStandardMaterial
                color="#64748b"
                metalness={0.25}
              />
            </mesh>
            <mesh
              position={[
                0,
                0.12,
                0,
              ]}
            >
              <sphereGeometry
                args={[
                  0.045,
                  10,
                  8,
                ]}
              />
              <meshStandardMaterial
                color={
                  index === 0
                    ? "#fde68a"
                    : "#f0abfc"
                }
                emissive={
                  index === 0
                    ? "#f59e0b"
                    : "#c026d3"
                }
                emissiveIntensity={0.9}
              />
            </mesh>
          </group>
        )
      )}
    </group>
  );
}

function CastleReach() {
  const banners =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }) => {
      if (!banners.current) {
        return;
      }

      banners.current.children.forEach(
        (child, index) => {
          child.rotation.y =
            Math.sin(
              clock.elapsedTime *
                1.8 +
                index
            ) *
            0.08;
        }
      );
    }
  );

  const stone = "#b8c5d4";
  const stoneDark = "#62748b";
  const roof = "#4d55a8";
  const gold = "#f6d66f";
  const glow = "#67e8f9";

  const tower = (
    x: number,
    z: number,
    scale = 1
  ) => (
    <group
      position={[
        x,
        0,
        z,
      ]}
      scale={scale}
    >
      <mesh
        position={[
          0,
          0.94,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.34,
            0.4,
            1.55,
            16,
          ]}
        />
        <meshStandardMaterial
          color={stone}
          roughness={0.78}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.8,
          0,
        ]}
      >
        <coneGeometry
          args={[
            0.48,
            0.72,
            16,
          ]}
        />
        <meshStandardMaterial
          color={roof}
          metalness={0.18}
          roughness={0.48}
        />
      </mesh>

      {[0, 1, 2, 3].map(
        (index) => (
          <mesh
            key={`crenel-${index}`}
            position={[
              Math.sin(
                (index / 4) *
                  Math.PI *
                  2
              ) * 0.3,
              1.66,
              Math.cos(
                (index / 4) *
                  Math.PI *
                  2
              ) * 0.3,
            ]}
          >
            <boxGeometry
              args={[
                0.13,
                0.18,
                0.13,
              ]}
            />
            <meshStandardMaterial
              color={stoneDark}
            />
          </mesh>
        )
      )}

      <mesh
        position={[
          0,
          1.08,
          0.34,
        ]}
      >
        <boxGeometry
          args={[
            0.16,
            0.3,
            0.035,
          ]}
        />
        <meshStandardMaterial
          color={glow}
          emissive="#0ea5e9"
          emissiveIntensity={0.55}
        />
      </mesh>
    </group>
  );

  return (
    <group scale={0.72}>
      {/* Floating approach terrace and bridge. */}
      <mesh
        position={[
          0,
          0.08,
          0,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <ringGeometry
          args={[
            1.48,
            2.12,
            48,
          ]}
        />
        <meshStandardMaterial
          color="#59d8ff"
          emissive="#0ea5e9"
          emissiveIntensity={0.28}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.18,
          1.78,
        ]}
      >
        <boxGeometry
          args={[
            0.72,
            0.16,
            1.75,
          ]}
        />
        <meshStandardMaterial
          color={stoneDark}
          roughness={0.82}
        />
      </mesh>

      {/* Outer walls. */}
      <mesh
        position={[
          0,
          0.72,
          0,
        ]}
      >
        <boxGeometry
          args={[
            2.15,
            1.08,
            1.76,
          ]}
        />
        <meshStandardMaterial
          color={stone}
          roughness={0.8}
        />
      </mesh>

      {/* Inner keep. */}
      <mesh
        position={[
          0,
          1.35,
          -0.12,
        ]}
      >
        <boxGeometry
          args={[
            1.1,
            1.65,
            0.98,
          ]}
        />
        <meshStandardMaterial
          color="#d2dce7"
          roughness={0.76}
        />
      </mesh>

      <mesh
        position={[
          0,
          2.22,
          -0.12,
        ]}
      >
        <coneGeometry
          args={[
            0.78,
            0.75,
            4,
          ]}
        />
        <meshStandardMaterial
          color={roof}
          metalness={0.16}
          roughness={0.45}
        />
      </mesh>

      {/* Corner towers. */}
      {tower(-1.0, -0.74, 1)}
      {tower(1.0, -0.74, 1)}
      {tower(-1.0, 0.74, 1)}
      {tower(1.0, 0.74, 1)}

      {/* Gatehouse. */}
      <mesh
        position={[
          0,
          0.85,
          0.92,
        ]}
      >
        <boxGeometry
          args={[
            0.94,
            1.35,
            0.34,
          ]}
        />
        <meshStandardMaterial
          color={stoneDark}
          roughness={0.78}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.58,
          1.11,
        ]}
      >
        <boxGeometry
          args={[
            0.44,
            0.82,
            0.06,
          ]}
        />
        <meshStandardMaterial
          color="#3c2a24"
          roughness={0.7}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.0,
          1.13,
        ]}
      >
        <torusGeometry
          args={[
            0.23,
            0.055,
            8,
            24,
            Math.PI,
          ]}
        />
        <meshStandardMaterial
          color={gold}
          metalness={0.52}
          roughness={0.32}
        />
      </mesh>

      {/* Castle windows. */}
      {[
        [-0.27, 1.28, 0.39],
        [0.27, 1.28, 0.39],
        [-0.27, 1.68, 0.39],
        [0.27, 1.68, 0.39],
      ].map((position, index) => (
        <mesh
          key={`keep-window-${index}`}
          position={position as Vec3}
        >
          <boxGeometry
            args={[
              0.13,
              0.24,
              0.035,
            ]}
          />
          <meshStandardMaterial
            color="#fde68a"
            emissive="#f59e0b"
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}

      {/* Animated banners. */}
      <group ref={banners}>
        {[-0.48, 0.48].map(
          (x, index) => (
            <group
              key={`banner-${index}`}
              position={[
                x,
                1.7,
                0.5,
              ]}
            >
              <mesh
                position={[
                  0,
                  0.22,
                  0,
                ]}
              >
                <cylinderGeometry
                  args={[
                    0.018,
                    0.018,
                    0.7,
                    8,
                  ]}
                />
                <meshStandardMaterial
                  color={gold}
                  metalness={0.7}
                />
              </mesh>

              <mesh
                position={[
                  0.14,
                  0.08,
                  0,
                ]}
              >
                <planeGeometry
                  args={[
                    0.28,
                    0.48,
                  ]}
                />
                <meshStandardMaterial
                  color={
                    index === 0
                      ? "#7c3aed"
                      : "#0ea5e9"
                  }
                  emissive={
                    index === 0
                      ? "#5b21b6"
                      : "#0369a1"
                  }
                  emissiveIntensity={0.18}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          )
        )}
      </group>
    </group>
  );
}

function StarportDock() {
  const ship =
    useRef<THREE.Group>(
      null
    );
  const ring =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }, delta) => {
      if (ship.current) {
        ship.current.position.y =
          1.34 +
          Math.sin(
            clock.elapsedTime *
              1.35
          ) *
            0.08;
        ship.current.rotation.y +=
          delta * 0.08;
      }

      if (ring.current) {
        ring.current.rotation.z +=
          delta * 0.2;
      }
    }
  );

  return (
    <group
      rotation={[
        0,
        0.3,
        0,
      ]}
      scale={0.78}
    >
      {/* Main docking disk. */}
      <mesh
        position={[
          0,
          0.18,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            1.7,
            1.9,
            0.28,
            40,
          ]}
        />
        <meshStandardMaterial
          color="#2f4560"
          metalness={0.62}
          roughness={0.34}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.34,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            1.45,
            1.45,
            0.08,
            40,
          ]}
        />
        <meshStandardMaterial
          color="#50708f"
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Luminous landing rings. */}
      {[0.72, 1.12, 1.55].map(
        (radius, index) => (
          <mesh
            key={`landing-ring-${index}`}
            position={[
              0,
              0.4 +
                index * 0.01,
              0,
            ]}
            rotation={[
              -Math.PI / 2,
              0,
              0,
            ]}
          >
            <ringGeometry
              args={[
                radius - 0.04,
                radius,
                48,
              ]}
            />
            <meshStandardMaterial
              color={
                index % 2 === 0
                  ? "#22d3ee"
                  : "#a78bfa"
              }
              emissive={
                index % 2 === 0
                  ? "#0891b2"
                  : "#7c3aed"
              }
              emissiveIntensity={0.85}
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      )}

      {/* Docking arms. */}
      {[0, 1, 2, 3].map(
        (index) => (
          <group
            key={`arm-${index}`}
            rotation={[
              0,
              (index *
                Math.PI) /
                2,
              0,
            ]}
          >
            <mesh
              position={[
                0,
                0.5,
                1.74,
              ]}
            >
              <boxGeometry
                args={[
                  0.42,
                  0.22,
                  0.95,
                ]}
              />
              <meshStandardMaterial
                color="#3b5875"
                metalness={0.54}
                roughness={0.36}
              />
            </mesh>

            <mesh
              position={[
                0,
                0.66,
                2.15,
              ]}
            >
              <boxGeometry
                args={[
                  0.54,
                  0.12,
                  0.18,
                ]}
              />
              <meshStandardMaterial
                color="#67e8f9"
                emissive="#06b6d4"
                emissiveIntensity={0.8}
              />
            </mesh>
          </group>
        )
      )}

      {/* Control tower. */}
      <group
        position={[
          -1.15,
          0,
          -0.85,
        ]}
      >
        <mesh
          position={[
            0,
            0.9,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.24,
              0.34,
              1.25,
              14,
            ]}
          />
          <meshStandardMaterial
            color="#425f7d"
            metalness={0.48}
            roughness={0.36}
          />
        </mesh>

        <mesh
          position={[
            0,
            1.58,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.46,
              0.4,
              0.24,
              18,
            ]}
          />
          <meshStandardMaterial
            color="#8de8ff"
            emissive="#38bdf8"
            emissiveIntensity={0.55}
            transparent
            opacity={0.92}
          />
        </mesh>

        <mesh
          position={[
            0,
            1.78,
            0,
          ]}
        >
          <coneGeometry
            args={[
              0.42,
              0.34,
              18,
            ]}
          />
          <meshStandardMaterial
            color="#273d55"
            metalness={0.6}
          />
        </mesh>
      </group>

      {/* Rotating portal ring. */}
      <group
        ref={ring}
        position={[
          1.15,
          1.18,
          -0.8,
        ]}
        rotation={[
          0,
          Math.PI / 2,
          0,
        ]}
      >
        <mesh>
          <torusGeometry
            args={[
              0.48,
              0.07,
              10,
              34,
            ]}
          />
          <meshStandardMaterial
            color="#a78bfa"
            emissive="#7c3aed"
            emissiveIntensity={0.72}
            metalness={0.5}
          />
        </mesh>
        {Array.from({ length: 8 }).map(
          (_, index) => {
            const angle =
              (index / 8) *
              Math.PI *
              2;
            return (
              <mesh
                key={`portal-node-${index}`}
                position={[
                  Math.sin(angle) *
                    0.48,
                  Math.cos(angle) *
                    0.48,
                  0,
                ]}
              >
                <sphereGeometry
                  args={[
                    0.045,
                    10,
                    8,
                  ]}
                />
                <meshStandardMaterial
                  color="#f8fafc"
                  emissive="#22d3ee"
                  emissiveIntensity={1.2}
                />
              </mesh>
            );
          }
        )}
      </group>

      {/* Hovering learning vessel. */}
      <group
        ref={ship}
        position={[
          0,
          1.34,
          0.18,
        ]}
      >
        <mesh
          rotation={[
            0,
            0,
            Math.PI / 2,
          ]}
        >
          <capsuleGeometry
            args={[
              0.28,
              1.15,
              8,
              18,
            ]}
          />
          <meshStandardMaterial
            color="#dbeafe"
            metalness={0.52}
            roughness={0.25}
          />
        </mesh>

        <mesh
          position={[
            0,
            0.18,
            0,
          ]}
        >
          <sphereGeometry
            args={[
              0.34,
              18,
              14,
            ]}
          />
          <meshStandardMaterial
            color="#67e8f9"
            emissive="#0891b2"
            emissiveIntensity={0.45}
            transparent
            opacity={0.82}
          />
        </mesh>

        {[-0.58, 0.58].map(
          (x, index) => (
            <group
              key={`wing-${index}`}
              position={[
                x,
                0,
                0,
              ]}
            >
              <mesh
                rotation={[
                  0,
                  0,
                  index === 0
                    ? 0.32
                    : -0.32,
                ]}
              >
                <boxGeometry
                  args={[
                    0.7,
                    0.08,
                    0.34,
                  ]}
                />
                <meshStandardMaterial
                  color="#637fa0"
                  metalness={0.5}
                />
              </mesh>

              <mesh
                position={[
                  index === 0
                    ? -0.34
                    : 0.34,
                  -0.08,
                  0,
                ]}
              >
                <sphereGeometry
                  args={[
                    0.09,
                    12,
                    10,
                  ]}
                />
                <meshStandardMaterial
                  color="#fde68a"
                  emissive="#f59e0b"
                  emissiveIntensity={1.1}
                />
              </mesh>
            </group>
          )
        )}
      </group>
    </group>
  );
}

function CrystalWilds() {
  return (
    <group scale={0.82}>
      {[
        [-0.95, 0, -0.45, 1.25, "#67e8f9"],
        [-0.25, 0, 0.35, 1.75, "#c084fc"],
        [0.55, 0, -0.18, 1.4, "#a5b4fc"],
        [1.0, 0, 0.65, 0.92, "#f0abfc"],
        [0.2, 0, -0.92, 1.05, "#5eead4"],
        [-0.8, 0, 0.85, 0.76, "#fde68a"],
      ].map(
        ([
          x,
          _,
          z,
          height,
          color,
        ], index) => (
          <group
            key={index}
            position={[
              x as number,
              0,
              z as number,
            ]}
          >
            <mesh
              position={[
                0,
                (height as number) *
                  0.45,
                0,
              ]}
              scale={[
                0.34,
                height as number,
                0.34,
              ]}
            >
              <octahedronGeometry
                args={[
                  0.58,
                  0,
                ]}
              />
              <meshStandardMaterial
                color={
                  color as string
                }
                emissive={
                  color as string
                }
                emissiveIntensity={0.72}
                metalness={0.34}
                roughness={0.2}
              />
            </mesh>

            <pointLight
              color={
                color as string
              }
              intensity={0.34}
              distance={3}
            />
          </group>
        )
      )}

      <mesh
        position={[
          0,
          0.03,
          0,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <ringGeometry
          args={[
            1.15,
            1.34,
            38,
          ]}
        />
        <meshBasicMaterial
          color="#c4b5fd"
          transparent
          opacity={0.32}
          side={
            THREE.DoubleSide
          }
        />
      </mesh>
    </group>
  );
}

function MoonTemple() {
  const orb =
    useRef<THREE.Group>(
      null
    );
  const glyphs =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }, delta) => {
      if (orb.current) {
        orb.current.rotation.y +=
          delta * 0.4;
        orb.current.position.y =
          2.0 +
          Math.sin(
            clock.elapsedTime *
              1.4
          ) *
            0.11;
      }

      if (glyphs.current) {
        glyphs.current.rotation.y -=
          delta * 0.14;
      }
    }
  );

  return (
    <group scale={0.78}>
      {/* Broad temple staircase. */}
      {[
        [2.4, 0.08, 1.8],
        [2.1, 0.18, 1.55],
        [1.8, 0.28, 1.3],
        [1.5, 0.38, 1.05],
      ].map(
        ([
          width,
          y,
          depth,
        ], index) => (
          <mesh
            key={`temple-step-${index}`}
            position={[
              0,
              y,
              0.7 -
                index * 0.1,
            ]}
          >
            <boxGeometry
              args={[
                width,
                0.16,
                depth,
              ]}
            />
            <meshStandardMaterial
              color={
                index % 2 === 0
                  ? "#8d93b5"
                  : "#a7accb"
              }
              roughness={0.78}
            />
          </mesh>
        )
      )}

      {/* Main sanctuary platform. */}
      <mesh
        position={[
          0,
          0.52,
          -0.05,
        ]}
      >
        <boxGeometry
          args={[
            2.35,
            0.28,
            1.85,
          ]}
        />
        <meshStandardMaterial
          color="#676f97"
          roughness={0.72}
        />
      </mesh>

      {/* Temple columns. */}
      {[-0.82, -0.28, 0.28, 0.82].map(
        (x, index) => (
          <group
            key={`column-${index}`}
            position={[
              x,
              0,
              0.12,
            ]}
          >
            <mesh
              position={[
                0,
                1.18,
                0,
              ]}
            >
              <cylinderGeometry
                args={[
                  0.1,
                  0.13,
                  1.4,
                  14,
                ]}
              />
              <meshStandardMaterial
                color="#d8d7ea"
                roughness={0.68}
              />
            </mesh>

            <mesh
              position={[
                0,
                0.47,
                0,
              ]}
            >
              <cylinderGeometry
                args={[
                  0.18,
                  0.18,
                  0.12,
                  14,
                ]}
              />
              <meshStandardMaterial
                color="#7b82aa"
              />
            </mesh>

            <mesh
              position={[
                0,
                1.9,
                0,
              ]}
            >
              <cylinderGeometry
                args={[
                  0.18,
                  0.15,
                  0.12,
                  14,
                ]}
              />
              <meshStandardMaterial
                color="#7b82aa"
              />
            </mesh>
          </group>
        )
      )}

      {/* Layered entablature and roof. */}
      <mesh
        position={[
          0,
          1.98,
          0.1,
        ]}
      >
        <boxGeometry
          args={[
            2.35,
            0.22,
            1.38,
          ]}
        />
        <meshStandardMaterial
          color="#c8c8df"
          roughness={0.66}
        />
      </mesh>

      <mesh
        position={[
          0,
          2.18,
          0.08,
        ]}
        rotation={[
          0,
          0,
          Math.PI / 4,
        ]}
      >
        <boxGeometry
          args={[
            1.65,
            1.65,
            0.22,
          ]}
        />
        <meshStandardMaterial
          color="#5b4f9d"
          metalness={0.18}
          roughness={0.48}
        />
      </mesh>

      {/* Moon gate behind the altar. */}
      <mesh
        position={[
          0,
          1.43,
          -0.78,
        ]}
      >
        <torusGeometry
          args={[
            0.72,
            0.1,
            12,
            40,
          ]}
        />
        <meshStandardMaterial
          color="#e9d5ff"
          emissive="#8b5cf6"
          emissiveIntensity={0.55}
          metalness={0.25}
          roughness={0.38}
        />
      </mesh>

      <mesh
        position={[
          0.18,
          1.48,
          -0.69,
        ]}
      >
        <sphereGeometry
          args={[
            0.61,
            28,
            20,
          ]}
        />
        <meshStandardMaterial
          color="#33245e"
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Altar. */}
      <mesh
        position={[
          0,
          0.86,
          -0.2,
        ]}
      >
        <boxGeometry
          args={[
            0.92,
            0.42,
            0.62,
          ]}
        />
        <meshStandardMaterial
          color="#8d93b5"
          roughness={0.72}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.09,
          -0.2,
        ]}
      >
        <boxGeometry
          args={[
            1.05,
            0.08,
            0.72,
          ]}
        />
        <meshStandardMaterial
          color="#d8d7ea"
          roughness={0.62}
        />
      </mesh>

      {/* Floating lunar orb. */}
      <group
        ref={orb}
        position={[
          0,
          2.0,
          -0.2,
        ]}
      >
        <mesh>
          <sphereGeometry
            args={[
              0.32,
              28,
              22,
            ]}
          />
          <meshStandardMaterial
            color="#f5f3ff"
            emissive="#c4b5fd"
            emissiveIntensity={1.0}
          />
        </mesh>

        <mesh scale={1.8}>
          <sphereGeometry
            args={[
              0.32,
              20,
              16,
            ]}
          />
          <meshBasicMaterial
            color="#a78bfa"
            transparent
            opacity={0.12}
            depthWrite={false}
          />
        </mesh>

        {Array.from({ length: 3 }).map(
          (_, index) => (
            <mesh
              key={`orb-ring-${index}`}
              rotation={[
                index * 0.65,
                index * 0.75,
                index * 0.4,
              ]}
            >
              <torusGeometry
                args={[
                  0.46 +
                    index * 0.08,
                  0.018,
                  6,
                  32,
                ]}
              />
              <meshStandardMaterial
                color={
                  index % 2 === 0
                    ? "#fde68a"
                    : "#67e8f9"
                }
                emissive={
                  index % 2 === 0
                    ? "#f59e0b"
                    : "#0891b2"
                }
                emissiveIntensity={0.72}
              />
            </mesh>
          )
        )}
      </group>

      {/* Orbiting glyph stones. */}
      <group
        ref={glyphs}
        position={[
          0,
          1.35,
          -0.2,
        ]}
      >
        {Array.from({ length: 8 }).map(
          (_, index) => {
            const angle =
              (index / 8) *
              Math.PI *
              2;
            return (
              <mesh
                key={`glyph-${index}`}
                position={[
                  Math.sin(angle) *
                    1.18,
                  Math.sin(
                    angle * 2
                  ) *
                    0.08,
                  Math.cos(angle) *
                    1.18,
                ]}
                rotation={[
                  0.3,
                  -angle,
                  index * 0.3,
                ]}
              >
                <octahedronGeometry
                  args={[
                    0.07,
                    0,
                  ]}
                />
                <meshStandardMaterial
                  color="#e9d5ff"
                  emissive="#7c3aed"
                  emissiveIntensity={0.9}
                />
              </mesh>
            );
          }
        )}
      </group>

      {/* Lanterns lining the stairs. */}
      {[
        [-0.95, 0.5, 0.95],
        [0.95, 0.5, 0.95],
        [-0.72, 0.72, 0.45],
        [0.72, 0.72, 0.45],
      ].map((position, index) => (
        <group
          key={`lantern-${index}`}
          position={position as Vec3}
        >
          <mesh>
            <cylinderGeometry
              args={[
                0.035,
                0.045,
                0.34,
                8,
              ]}
            />
            <meshStandardMaterial
              color="#64748b"
              metalness={0.4}
            />
          </mesh>
          <mesh
            position={[
              0,
              0.23,
              0,
            ]}
          >
            <sphereGeometry
              args={[
                0.07,
                12,
                10,
              ]}
            />
            <meshStandardMaterial
              color="#fff4bd"
              emissive={
                index % 2 === 0
                  ? "#f59e0b"
                  : "#a855f7"
              }
              emissiveIntensity={1.0}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function NovaPedestal() {
  const upperRing =
    useRef<THREE.Mesh>(
      null
    );

  const aura =
    useRef<THREE.Mesh>(
      null
    );

  useFrame(
    ({ clock }, delta) => {
      if (upperRing.current) {
        upperRing.current.rotation.z +=
          delta * 0.28;
      }

      if (aura.current) {
        const pulse =
          1 +
          Math.sin(
            clock.elapsedTime *
              1.9
          ) *
            0.055;

        aura.current.scale.set(
          pulse,
          pulse,
          pulse
        );
      }
    }
  );

  return (
    <group>
      {/* Ground shadow */}
      <mesh
        position={[
          0,
          0.015,
          0,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        scale={[
          1.12,
          0.72,
          1,
        ]}
      >
        <circleGeometry
          args={[
            0.62,
            34,
          ]}
        />
        <meshBasicMaterial
          color="#020617"
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      {/* Wide lower plinth */}
      <mesh
        position={[
          0,
          0.09,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.56,
            0.66,
            0.18,
            34,
          ]}
        />
        <meshStandardMaterial
          color="#4a1b35"
          emissive="#5e173c"
          emissiveIntensity={0.16}
          roughness={0.5}
          metalness={0.12}
        />
      </mesh>

      {/* Raised middle tier */}
      <mesh
        position={[
          0,
          0.215,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.45,
            0.52,
            0.12,
            34,
          ]}
        />
        <meshStandardMaterial
          color="#77244c"
          emissive="#a21f55"
          emissiveIntensity={0.22}
          roughness={0.4}
          metalness={0.16}
        />
      </mesh>

      {/* Top platform */}
      <mesh
        position={[
          0,
          0.315,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.35,
            0.41,
            0.09,
            34,
          ]}
        />
        <meshStandardMaterial
          color="#a93462"
          emissive="#fb7185"
          emissiveIntensity={0.28}
          roughness={0.32}
          metalness={0.14}
        />
      </mesh>

      {/* Rotating luminous rim */}
      <mesh
        ref={upperRing}
        position={[
          0,
          0.365,
          0,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <torusGeometry
          args={[
            0.29,
            0.033,
            10,
            40,
          ]}
        />
        <meshBasicMaterial
          color="#fda4af"
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>

      {/* Soft magical aura around the base */}
      <mesh
        ref={aura}
        position={[
          0,
          0.035,
          0,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <ringGeometry
          args={[
            0.64,
            0.84,
            42,
          ]}
        />
        <meshBasicMaterial
          color="#f9a8d4"
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <pointLight
        position={[
          0,
          0.62,
          0,
        ]}
        color="#fb7185"
        intensity={0.42}
        distance={2.8}
      />
    </group>
  );
}

function NovaOverlayAnchor({
  onProject,
}: {
  onProject: (
    projection: NovaOverlayProjection
  ) => void;
}) {
  const anchor =
    useRef<THREE.Group>(
      null
    );

  const worldPosition =
    useMemo(
      () => new THREE.Vector3(),
      []
    );

  const projectedPosition =
    useMemo(
      () => new THREE.Vector3(),
      []
    );

  const lastProjection =
    useRef<NovaOverlayProjection>({
      x: -1000,
      y: -1000,
      visible: false,
      scale: 1,
    });

  useFrame(
    ({
      camera,
      size,
    }) => {
      if (!anchor.current) {
        return;
      }

      anchor.current.getWorldPosition(
        worldPosition
      );

      projectedPosition.copy(
        worldPosition
      );

      projectedPosition.project(
        camera
      );

      const x =
        (projectedPosition.x *
          0.5 +
          0.5) *
        size.width;

      const y =
        (-projectedPosition.y *
          0.5 +
          0.5) *
        size.height;

      const distance =
        camera.position.distanceTo(
          worldPosition
        );

      const scale =
        clamp(
          14.8 /
            Math.max(
              0.01,
              distance
            ),
          0.72,
          1.34
        );

      const visible =
        projectedPosition.z >
          -1 &&
        projectedPosition.z < 1 &&
        projectedPosition.x >
          -1.25 &&
        projectedPosition.x < 1.25 &&
        projectedPosition.y >
          -1.3 &&
        projectedPosition.y < 1.3;

      const previous =
        lastProjection.current;

      if (
        Math.abs(
          previous.x - x
        ) < 0.35 &&
        Math.abs(
          previous.y - y
        ) < 0.35 &&
        Math.abs(
          previous.scale -
            scale
        ) < 0.004 &&
        previous.visible ===
          visible
      ) {
        return;
      }

      const next = {
        x,
        y,
        visible,
        scale,
      };

      lastProjection.current =
        next;

      onProject(next);
    }
  );

  /*
   * The sprite's feet align to this point just above the real pedestal.
   * Because this group is inside the Island's rotated group, its projected
   * screen position follows every orbit, tilt, zoom, and focus movement.
   */
  return (
    <group
      ref={anchor}
      position={[
        0,
        0.39,
        0,
      ]}
    />
  );
}

function LunisResidentModel() {
  const root =
    useRef<THREE.Group>(
      null
    );

  const leftEar =
    useRef<THREE.Group>(
      null
    );

  const rightEar =
    useRef<THREE.Group>(
      null
    );

  const eyes =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }, delta) => {
      const time =
        clock.elapsedTime;

      if (root.current) {
        const hop =
          Math.max(
            0,
            Math.sin(
              time * 1.3
            )
          );

        root.current.position.y =
          0.92 +
          hop * hop * 0.075;

        root.current.rotation.y =
          0.2 +
          Math.sin(
            time * 0.68
          ) *
            0.09;
      }

      if (leftEar.current) {
        leftEar.current.rotation.z =
          0.16 +
          Math.sin(
            time * 1.0
          ) *
            0.08;
      }

      if (rightEar.current) {
        rightEar.current.rotation.z =
          -0.16 +
          Math.sin(
            time * 1.0 +
              1.1
          ) *
            0.08;
      }

      if (eyes.current) {
        const cycle =
          time % 5.4;

        const blink =
          cycle > 5.16
            ? 0.08
            : 1;

        eyes.current.scale.y =
          damp(
            eyes.current.scale.y,
            blink,
            24,
            delta
          );
      }
    }
  );

  const fur = "#211e20";
  const furSoft = "#3a3337";
  const innerEar = "#f3c56b";
  const nose = "#43d7e8";

  return (
    <group
      ref={root}
      position={[
        0.28,
        0.89,
        0.82,
      ]}
      rotation={[
        0,
        0.2,
        0,
      ]}
      scale={0.28}
    >
      {/* Shadow */}
      <mesh
        position={[
          0,
          0.02,
          0,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        scale={[
          0.76,
          0.52,
          1,
        ]}
      >
        <circleGeometry
          args={[
            0.68,
            28,
          ]}
        />
        <meshBasicMaterial
          color="#020617"
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      {/* Feet */}
      {[-0.28, 0.28].map(
        (x) => (
          <mesh
            key={x}
            position={[
              x,
              0.22,
              0.15,
            ]}
            scale={[
              0.38,
              0.24,
              0.54,
            ]}
          >
            <sphereGeometry
              args={[
                1,
                18,
                14,
              ]}
            />
            <meshStandardMaterial
              color={furSoft}
              roughness={0.84}
            />
          </mesh>
        )
      )}

      {/* Body */}
      <mesh
        position={[
          0,
          0.84,
          0,
        ]}
        scale={[
          0.72,
          0.8,
          0.66,
        ]}
      >
        <sphereGeometry
          args={[
            0.78,
            24,
            20,
          ]}
        />
        <meshStandardMaterial
          color={fur}
          roughness={0.82}
        />
      </mesh>

      {/* Chest tuft */}
      <mesh
        position={[
          0,
          1.03,
          0.49,
        ]}
        scale={[
          0.34,
          0.21,
          0.1,
        ]}
      >
        <octahedronGeometry
          args={[
            1,
            0,
          ]}
        />
        <meshStandardMaterial
          color="#3b3538"
          roughness={0.86}
        />
      </mesh>

      {/* Arms */}
      {[-1, 1].map(
        (side) => (
          <mesh
            key={side}
            position={[
              side * 0.48,
              0.96,
              0.12,
            ]}
            rotation={[
              0,
              0,
              side * -0.44,
            ]}
            scale={[
              0.24,
              0.42,
              0.24,
            ]}
          >
            <capsuleGeometry
              args={[
                0.36,
                0.42,
                8,
                12,
              ]}
            />
            <meshStandardMaterial
              color={furSoft}
              roughness={0.82}
            />
          </mesh>
        )
      )}

      {/* Head */}
      <mesh
        position={[
          0,
          1.8,
          0.1,
        ]}
        scale={[
          0.82,
          0.75,
          0.75,
        ]}
      >
        <sphereGeometry
          args={[
            0.82,
            26,
            22,
          ]}
        />
        <meshStandardMaterial
          color={fur}
          roughness={0.8}
        />
      </mesh>

      {/* Ears */}
      <group
        ref={leftEar}
        position={[
          -0.36,
          2.49,
          0.06,
        ]}
        rotation={[
          0,
          0,
          0.16,
        ]}
      >
        <mesh
          scale={[
            0.42,
            0.9,
            0.34,
          ]}
        >
          <capsuleGeometry
            args={[
              0.3,
              0.92,
              8,
              14,
            ]}
          />
          <meshStandardMaterial
            color={fur}
            roughness={0.8}
          />
        </mesh>

        <mesh
          position={[
            0,
            0,
            0.26,
          ]}
          scale={[
            0.21,
            0.64,
            0.06,
          ]}
        >
          <capsuleGeometry
            args={[
              0.3,
              0.92,
              8,
              14,
            ]}
          />
          <meshStandardMaterial
            color={innerEar}
            emissive="#6d4300"
            emissiveIntensity={0.08}
            roughness={0.66}
          />
        </mesh>
      </group>

      <group
        ref={rightEar}
        position={[
          0.36,
          2.49,
          0.06,
        ]}
        rotation={[
          0,
          0,
          -0.16,
        ]}
      >
        <mesh
          scale={[
            0.42,
            0.9,
            0.34,
          ]}
        >
          <capsuleGeometry
            args={[
              0.3,
              0.92,
              8,
              14,
            ]}
          />
          <meshStandardMaterial
            color={fur}
            roughness={0.8}
          />
        </mesh>

        <mesh
          position={[
            0,
            0,
            0.26,
          ]}
          scale={[
            0.21,
            0.64,
            0.06,
          ]}
        >
          <capsuleGeometry
            args={[
              0.3,
              0.92,
              8,
              14,
            ]}
          />
          <meshStandardMaterial
            color={innerEar}
            emissive="#6d4300"
            emissiveIntensity={0.08}
            roughness={0.66}
          />
        </mesh>
      </group>

      {/* Eyes */}
      <group
        ref={eyes}
        position={[
          0,
          1.86,
          0.65,
        ]}
      >
        {[-0.24, 0.24].map(
          (x) => (
            <group
              key={x}
              position={[
                x,
                0,
                0,
              ]}
            >
              <mesh
                scale={[
                  0.15,
                  0.2,
                  0.052,
                ]}
              >
                <sphereGeometry
                  args={[
                    1,
                    16,
                    12,
                  ]}
                />
                <meshBasicMaterial
                  color="#f8fafc"
                />
              </mesh>

              <mesh
                position={[
                  0,
                  -0.012,
                  0.044,
                ]}
                scale={[
                  0.078,
                  0.106,
                  0.028,
                ]}
              >
                <sphereGeometry
                  args={[
                    1,
                    14,
                    10,
                  ]}
                />
                <meshBasicMaterial
                  color="#171215"
                />
              </mesh>

              <mesh
                position={[
                  -0.022,
                  0.05,
                  0.064,
                ]}
                scale={[
                  0.024,
                  0.03,
                  0.009,
                ]}
              >
                <sphereGeometry
                  args={[
                    1,
                    10,
                    8,
                  ]}
                />
                <meshBasicMaterial
                  color="#ffffff"
                />
              </mesh>
            </group>
          )
        )}
      </group>

      {/* Nose */}
      <mesh
        position={[
          0,
          1.66,
          0.71,
        ]}
        scale={[
          0.145,
          0.09,
          0.07,
        ]}
      >
        <sphereGeometry
          args={[
            1,
            16,
            12,
          ]}
        />
        <meshStandardMaterial
          color={nose}
          emissive="#0891b2"
          emissiveIntensity={0.58}
          roughness={0.3}
        />
      </mesh>

      {/* Smile */}
      <mesh
        position={[
          0,
          1.52,
          0.69,
        ]}
        scale={[
          0.19,
          0.125,
          0.048,
        ]}
      >
        <sphereGeometry
          args={[
            1,
            16,
            12,
          ]}
        />
        <meshBasicMaterial
          color="#5d241b"
        />
      </mesh>

      <mesh
        position={[
          0,
          1.48,
          0.73,
        ]}
        scale={[
          0.1,
          0.05,
          0.019,
        ]}
      >
        <sphereGeometry
          args={[
            1,
            14,
            10,
          ]}
        />
        <meshBasicMaterial
          color="#ff9b75"
        />
      </mesh>

      {/* Tail */}
      <mesh
        position={[
          -0.5,
          0.74,
          -0.44,
        ]}
        scale={[
          0.4,
          0.4,
          0.4,
        ]}
      >
        <sphereGeometry
          args={[
            0.72,
            18,
            14,
          ]}
        />
        <meshStandardMaterial
          color="#3a3437"
          roughness={0.92}
        />
      </mesh>
    </group>
  );
}


function StoryResidents({
  level,
}: {
  level: number;
}) {
  if (level < 1) {
    return null;
  }

  return (
    <group>
      <LunisResidentModel />
    </group>
  );
}

function MagicWisps({
  level,
}: {
  level: number;
}) {
  const group =
    useRef<THREE.Group>(
      null
    );

  const positions =
    useMemo(() => {
      const values: number[] = [];

      const count =
        Math.min(
          72,
          22 + level * 3
        );

      for (
        let index = 0;
        index < count;
        index += 1
      ) {
        const angle =
          ((index * 137.5) %
            360) *
          (Math.PI / 180);

        const radius =
          1.5 +
          ((index * 29) % 35) /
            10;

        values.push(
          Math.cos(angle) *
            radius,
          1.15 +
            ((index * 43) % 20) /
              10,
          Math.sin(angle) *
            radius
        );
      }

      return new Float32Array(
        values
      );
    }, [level]);

  useFrame(
    ({ clock }, delta) => {
      if (!group.current) {
        return;
      }

      group.current.rotation.y +=
        delta * 0.045;

      group.current.position.y =
        Math.sin(
          clock.elapsedTime *
            0.75
        ) *
          0.08;
    }
  );

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              positions,
              3,
            ]}
          />
        </bufferGeometry>

        <pointsMaterial
          color="#a5f3fc"
          size={0.075}
          transparent
          opacity={0.64}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}

function MysteryBeacon({
  selected,
}: {
  selected: boolean;
}) {
  const group =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }, delta) => {
      if (!group.current) {
        return;
      }

      group.current.rotation.y +=
        delta * 0.55;

      group.current.position.y =
        1.45 +
        Math.sin(
          clock.elapsedTime *
            1.8
        ) *
          0.12;
    }
  );

  return (
    <group
      ref={group}
      position={[
        0,
        1.45,
        0,
      ]}
    >
      {selected ? (
        <SelectionRing
          color="#c4b5fd"
        />
      ) : null}

      <mesh scale={1.55}>
        <sphereGeometry
          args={[
            0.56,
            18,
            16,
          ]}
        />
        <meshStandardMaterial
          color="#12182a"
          transparent
          opacity={0.72}
          emissive="#4c1d95"
          emissiveIntensity={0.35}
        />
      </mesh>

      <mesh
        rotation={[
          0,
          0,
          -0.22,
        ]}
      >
        <torusGeometry
          args={[
            0.31,
            0.085,
            12,
            34,
            Math.PI * 1.45,
          ]}
        />
        <meshStandardMaterial
          color="#ddd6fe"
          emissive="#8b5cf6"
          emissiveIntensity={0.95}
          metalness={0.18}
          roughness={0.28}
        />
      </mesh>

      <mesh
        position={[
          0.1,
          -0.39,
          0,
        ]}
        rotation={[
          0,
          0,
          0.16,
        ]}
      >
        <cylinderGeometry
          args={[
            0.075,
            0.075,
            0.24,
            12,
          ]}
        />
        <meshStandardMaterial
          color="#ddd6fe"
          emissive="#8b5cf6"
          emissiveIntensity={0.95}
        />
      </mesh>

      <mesh
        position={[
          0.13,
          -0.7,
          0,
        ]}
      >
        <sphereGeometry
          args={[
            0.1,
            14,
            12,
          ]}
        />
        <meshStandardMaterial
          color="#f5f3ff"
          emissive="#a78bfa"
          emissiveIntensity={1.1}
        />
      </mesh>

      <mesh scale={2.45}>
        <sphereGeometry
          args={[
            0.56,
            16,
            14,
          ]}
        />
        <meshBasicMaterial
          color="#a78bfa"
          transparent
          opacity={0.075}
          depthWrite={false}
        />
      </mesh>

      <mesh
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <torusGeometry
          args={[
            0.72,
            0.035,
            8,
            40,
          ]}
        />
        <meshBasicMaterial
          color="#c4b5fd"
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function ScreenSpaceTapTarget({
  pixels = 78,
  y = 0.72,
  minWorld = 0.9,
  maxWorld = 5.2,
}: {
  pixels?: number;
  y?: number;
  minWorld?: number;
  maxWorld?: number;
}) {
  const ref =
    useRef<THREE.Sprite>(
      null
    );

  const {
    camera,
    size,
  } = useThree();

  const worldPosition =
    useMemo(
      () =>
        new THREE.Vector3(),
      []
    );

  const worldScale =
    useMemo(
      () =>
        new THREE.Vector3(),
      []
    );

  useFrame(() => {
    if (!ref.current) {
      return;
    }

    ref.current.getWorldPosition(
      worldPosition
    );

    const distance =
      Math.max(
        0.01,
        camera.position.distanceTo(
          worldPosition
        )
      );

    let desiredWorldSize =
      minWorld;

    const perspective =
      camera as THREE.PerspectiveCamera;

    if (
      perspective.isPerspectiveCamera
    ) {
      const visibleWorldHeight =
        2 *
        Math.tan(
          THREE.MathUtils.degToRad(
            perspective.fov
          ) / 2
        ) *
        distance;

      desiredWorldSize =
        visibleWorldHeight *
        (pixels /
          Math.max(
            1,
            size.height
          ));
    } else {
      const orthographic =
        camera as THREE.OrthographicCamera;

      if (
        orthographic.isOrthographicCamera
      ) {
        const visibleWorldHeight =
          Math.abs(
            orthographic.top -
              orthographic.bottom
          ) /
          Math.max(
            0.01,
            orthographic.zoom
          );

        desiredWorldSize =
          visibleWorldHeight *
          (pixels /
            Math.max(
              1,
              size.height
            ));
      }
    }

    const clampedWorldSize =
      THREE.MathUtils.clamp(
        desiredWorldSize,
        minWorld,
        maxWorld
      );

    const parent =
      ref.current.parent;

    if (parent) {
      parent.getWorldScale(
        worldScale
      );
    } else {
      worldScale.set(
        1,
        1,
        1
      );
    }

    const inheritedScale =
      Math.max(
        0.01,
        Math.abs(
          worldScale.x
        ),
        Math.abs(
          worldScale.y
        ),
        Math.abs(
          worldScale.z
        )
      );

    const localSize =
      clampedWorldSize /
      inheritedScale;

    ref.current.scale.set(
      localSize,
      localSize,
      1
    );
  });

  return (
    <sprite
      ref={ref}
      position={[
        0,
        y,
        0,
      ]}
    >
      <spriteMaterial
        color="#ffffff"
        transparent
        opacity={0.001}
        depthWrite={false}
        depthTest={false}
      />
    </sprite>
  );
}

function LandmarkObject({
  milestone,
  level,
  selected,
  placement,
  builderEnabled,
  onBuilderDragStart,
  onSelect,
}: {
  milestone: IslandMilestone;
  level: number;
  selected: boolean;
  placement: IslandPlacement | null;
  builderEnabled: boolean;
  onBuilderDragStart: (
    milestoneId: string
  ) => void;
  onSelect: (
    milestoneId: string,
    position: Vec3
  ) => void;
}) {
  const fallbackPosition =
    LANDMARK_POSITIONS[
      milestone.id
    ] ?? DEFAULT_TARGET;

  const unlocked =
    level >= milestone.level;

  const transform =
    placement?.transform;

  const position: Vec3 =
    transform
      ? [
          transform.x,
          transform.y,
          transform.z,
        ]
      : fallbackPosition;

  const rotationY =
    transform?.rotationY ?? 0;

  const placementScale =
    transform?.scale ?? 1;

  const object = (() => {
    if (!unlocked) {
      return null;
    }

    switch (milestone.id) {
      case "study_grove":
        return (
          <Tree unlocked />
        );

      case "starlight_garden":
        return (
          <Garden unlocked />
        );

      case "nova_library":
        return (
          <Library unlocked />
        );

      case "whisperwind_mill":
        return <Windmill />;

      case "learning_falls":
        return (
          <Waterfall unlocked />
        );

      case "moonwell":
        return <Moonwell />;

      case "sky_observatory":
        return (
          <Observatory unlocked />
        );

      case "companion_habitat":
        return (
          <Habitat unlocked />
        );

      case "castle_reach":
        return <CastleReach />;

      case "starport_dock":
        return <StarportDock />;

      case "crystal_wilds":
        return <CrystalWilds />;

      case "moon_temple":
        return <MoonTemple />;

      default:
        return null;
    }
  })();

  return (
    <group
      visible={
        unlocked &&
        !(
          builderEnabled &&
          unlocked &&
          !placement
        )
      }
      position={position}
      rotation={[
        0,
        rotationY,
        0,
      ]}
      scale={placementScale}
      onPointerDown={(event) => {
        if (
          builderEnabled &&
          unlocked &&
          placement &&
          selected
        ) {
          event.stopPropagation();
          onBuilderDragStart(
            milestone.id
          );
        }
      }}
      onClick={(event) => {
        event.stopPropagation();

        if (
          builderEnabled &&
          unlocked &&
          !placement
        ) {
          return;
        }

        onSelect(
          milestone.id,
          position
        );
      }}
    >
      {builderEnabled &&
      unlocked &&
      placement ? (
        <ScreenSpaceTapTarget
          pixels={64}
          y={0.92}
          minWorld={1.05}
          maxWorld={4.6}
        />
      ) : null}

      {!builderEnabled && unlocked ? (
        <ScreenSpaceTapTarget
          pixels={52}
          y={0.92}
          minWorld={0.92}
          maxWorld={3.7}
        />
      ) : null}

      {unlocked ? (
        <>
          {selected ? (
            <SelectionRing
              color="#67e8f9"
            />
          ) : null}

          {object}
        </>
      ) : (
        <MysteryBeacon
          selected={selected}
        />
      )}
    </group>
  );
}

function WindChimeSparkle({
  position,
  phase,
  color,
}: {
  position: Vec3;
  phase: number;
  color: string;
}) {
  const ref =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }) => {
      if (!ref.current) {
        return;
      }

      const time =
        clock.elapsedTime +
        phase;

      ref.current.position.y =
        position[1] +
        Math.sin(
          time * 1.8
        ) *
          0.08;

      ref.current.position.x =
        position[0] +
        Math.cos(
          time * 1.15
        ) *
          0.035;

      ref.current.rotation.z +=
        0.018;

      const pulse =
        0.82 +
        Math.sin(
          time * 2.2
        ) *
          0.18;

      ref.current.scale.set(
        pulse,
        pulse,
        pulse
      );
    }
  );

  return (
    <group
      ref={ref}
      position={position}
    >
      <mesh
        rotation={[
          0,
          0,
          Math.PI / 4,
        ]}
      >
        <octahedronGeometry
          args={[
            0.055,
            0,
          ]}
        />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.92}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={2.25}>
        <sphereGeometry
          args={[
            0.05,
            8,
            8,
          ]}
        />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function StarWindChime({
  accent,
}: {
  accent: string;
}) {
  const chime =
    useRef<THREE.Group>(
      null
    );

  const hangingStar =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }) => {
      const time =
        clock.elapsedTime;

      if (chime.current) {
        chime.current.rotation.z =
          Math.sin(
            time * 1.12
          ) *
          0.105;

        chime.current.rotation.x =
          Math.cos(
            time * 0.88
          ) *
          0.035;
      }

      if (hangingStar.current) {
        hangingStar.current.rotation.y +=
          0.022;

        hangingStar.current.rotation.z =
          Math.sin(
            time * 1.7
          ) *
          0.16;
      }
    }
  );

  const sparkles =
    useMemo(
      () => [
        {
          position: [
            -0.42,
            0.35,
            0.12,
          ] as Vec3,
          phase: 0.2,
          color: "#fef08a",
        },
        {
          position: [
            0.38,
            0.3,
            -0.1,
          ] as Vec3,
          phase: 1.1,
          color: "#f0abfc",
        },
        {
          position: [
            -0.18,
            0.02,
            -0.16,
          ] as Vec3,
          phase: 2.0,
          color: "#ffffff",
        },
        {
          position: [
            0.22,
            -0.04,
            0.16,
          ] as Vec3,
          phase: 2.8,
          color: "#fde68a",
        },
        {
          position: [
            0.02,
            0.53,
            0.18,
          ] as Vec3,
          phase: 3.5,
          color: "#e9d5ff",
        },
        {
          position: [
            -0.5,
            0.08,
            -0.04,
          ] as Vec3,
          phase: 4.2,
          color: "#f9a8d4",
        },
      ],
      []
    );

  return (
    <group
      position={[
        0,
        0.16,
        0,
      ]}
      scale={0.92}
    >
      {/* Small hanging loop */}
      <mesh
        position={[
          0,
          0.9,
          0,
        ]}
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
      >
        <torusGeometry
          args={[
            0.12,
            0.025,
            8,
            24,
          ]}
        />
        <meshStandardMaterial
          color="#f8fafc"
          metalness={0.62}
          roughness={0.24}
        />
      </mesh>

      <group
        ref={chime}
        position={[
          0,
          0.7,
          0,
        ]}
      >
        {/* Curved silver canopy */}
        <mesh
          position={[
            0,
            0,
            0,
          ]}
          scale={[
            1,
            0.34,
            1,
          ]}
        >
          <sphereGeometry
            args={[
              0.43,
              24,
              16,
              0,
              Math.PI * 2,
              0,
              Math.PI / 2,
            ]}
          />
          <meshStandardMaterial
            color="#dbeafe"
            emissive={accent}
            emissiveIntensity={0.16}
            metalness={0.72}
            roughness={0.22}
          />
        </mesh>

        {/* Canopy rim */}
        <mesh
          position={[
            0,
            -0.01,
            0,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
        >
          <torusGeometry
            args={[
              0.41,
              0.035,
              10,
              34,
            ]}
          />
          <meshStandardMaterial
            color="#f8fafc"
            metalness={0.78}
            roughness={0.18}
          />
        </mesh>

        {[
          [
            -0.25,
            -0.33,
            0.08,
            0.36,
          ],
          [
            -0.08,
            -0.4,
            -0.08,
            0.46,
          ],
          [
            0.1,
            -0.37,
            0.08,
            0.4,
          ],
          [
            0.27,
            -0.31,
            -0.06,
            0.32,
          ],
        ].map(
          (
            [
              x,
              y,
              z,
              length,
            ],
            index
          ) => (
            <group
              key={index}
              position={[
                x,
                y,
                z,
              ]}
            >
              {/* Thread */}
              <mesh
                position={[
                  0,
                  length / 2,
                  0,
                ]}
              >
                <cylinderGeometry
                  args={[
                    0.009,
                    0.009,
                    length,
                    8,
                  ]}
                />
                <meshBasicMaterial
                  color="#f8fafc"
                />
              </mesh>

              {/* Silver tube */}
              <mesh
                position={[
                  0,
                  -0.11,
                  0,
                ]}
              >
                <cylinderGeometry
                  args={[
                    0.035,
                    0.045,
                    0.31 +
                      index *
                        0.035,
                    12,
                  ]}
                />
                <meshStandardMaterial
                  color={
                    index % 2
                      ? "#e9d5ff"
                      : "#dbeafe"
                  }
                  emissive={
                    index % 2
                      ? accent
                      : "#60a5fa"
                  }
                  emissiveIntensity={0.24}
                  metalness={0.7}
                  roughness={0.22}
                />
              </mesh>
            </group>
          )
        )}

        {/* Center string and clapper */}
        <mesh
          position={[
            0,
            -0.42,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.01,
              0.01,
              0.82,
              8,
            ]}
          />
          <meshBasicMaterial
            color="#fff7ed"
          />
        </mesh>

        <mesh
          position={[
            0,
            -0.48,
            0,
          ]}
          scale={[
            1,
            0.42,
            1,
          ]}
        >
          <sphereGeometry
            args={[
              0.12,
              16,
              12,
            ]}
          />
          <meshStandardMaterial
            color="#fde68a"
            emissive="#facc15"
            emissiveIntensity={0.38}
            metalness={0.42}
            roughness={0.26}
          />
        </mesh>

        {/* Large glowing star sail */}
        <group
          ref={hangingStar}
          position={[
            0,
            -0.88,
            0,
          ]}
        >
          <mesh
            rotation={[
              0,
              0,
              Math.PI / 4,
            ]}
            scale={[
              1,
              1.22,
              0.38,
            ]}
          >
            <octahedronGeometry
              args={[
                0.18,
                0,
              ]}
            />
            <meshStandardMaterial
              color="#fff3a8"
              emissive="#fde047"
              emissiveIntensity={0.75}
              metalness={0.18}
              roughness={0.24}
            />
          </mesh>

          <pointLight
            color="#fde68a"
            intensity={0.42}
            distance={2}
          />
        </group>
      </group>

      {/* Continuous stardust drifting around the chime */}
      {sparkles.map(
        (
          sparkle,
          index
        ) => (
          <WindChimeSparkle
            key={index}
            position={
              sparkle.position
            }
            phase={
              sparkle.phase
            }
            color={
              sparkle.color
            }
          />
        )
      )}
    </group>
  );
}


type FriendshipVisualKey =
  | "nova_bunny"
  | "balloons"
  | "hearts"
  | "sleepy_moon"
  | "star_blow"
  | "star_explode"
  | "star_throw"
  | "party_3d"
  | "party_3d_2"
  | "coins_rain"
  | "reading_buddy";

function friendshipVisualKey(
  discovery: Island3DDiscovery
): FriendshipVisualKey | null {
  const identity =
    `${discovery.companionId ?? ""}|${discovery.key}|${discovery.title}`
      .toLowerCase()
      .replace(/[\s:-]+/g, "_");

  if (
    identity.includes("party_3d_2") ||
    identity.includes("neon_party_lantern")
  ) {
    return "party_3d_2";
  }

  if (
    identity.includes("nova_bunny") ||
    identity.includes("bunny_burrow")
  ) {
    return "nova_bunny";
  }

  if (
    identity.includes("balloons") ||
    identity.includes("balloon_arch")
  ) {
    return "balloons";
  }

  if (
    identity.includes("hearts") ||
    identity.includes("friendship_bench") ||
    identity.includes("heart_drift")
  ) {
    return "hearts";
  }

  if (
    identity.includes("sleepy_moon") ||
    identity.includes("moonlit_hammock")
  ) {
    return "sleepy_moon";
  }

  if (
    identity.includes("star_blow") ||
    identity.includes("star_wind_chime")
  ) {
    return "star_blow";
  }

  if (
    identity.includes("star_explode") ||
    identity.includes("star_burst") ||
    identity.includes("burst_crystal_cluster")
  ) {
    return "star_explode";
  }

  if (
    identity.includes("star_throw") ||
    identity.includes("star_toss") ||
    identity.includes("star_toss_target")
  ) {
    return "star_throw";
  }

  if (
    identity.includes("party_3d") ||
    identity.includes("party_platform")
  ) {
    return "party_3d";
  }

  if (
    identity.includes("coins_rain") ||
    identity.includes("coin_shower") ||
    identity.includes("coin_wishing_well")
  ) {
    return "coins_rain";
  }

  if (
    identity.includes("reading_buddy") ||
    identity.includes("reading_nook") ||
    identity.includes("cozy_reading_spot")
  ) {
    return "reading_buddy";
  }

  return null;
}

/*
 * Every current friendship reward receives a deliberate home instead of
 * sharing a tiny zone-centered orbit. This prevents keepsakes, residents,
 * landmarks, Nova, and Lunis from occupying the same physical space when
 * the development preview displays all 22 rewards together.
 */
const FRIENDSHIP_DISCOVERY_POSITIONS: Record<
  FriendshipVisualKey,
  {
    keepsake: Vec3;
    resident: Vec3;
  }
> = {
  nova_bunny: {
    keepsake: [
      -3.8,
      0.82,
      0.2,
    ],
    resident: [
      -3.55,
      0.82,
      1.35,
    ],
  },
  balloons: {
    keepsake: [
      -1.35,
      0.82,
      3.35,
    ],
    resident: [
      0.05,
      0.82,
      4.05,
    ],
  },
  hearts: {
    keepsake: [
      -3.6,
      0.82,
      2.7,
    ],
    resident: [
      -2.45,
      0.82,
      3.65,
    ],
  },
  sleepy_moon: {
    keepsake: [
      -3.65,
      0.82,
      -2.0,
    ],
    resident: [
      -2.55,
      0.82,
      -1.5,
    ],
  },
  star_blow: {
    /*
     * The Star Wind Chime deliberately sits on the far observatory edge,
     * nowhere near the Coin Wishing Well.
     */
    keepsake: [
      4.25,
      0.82,
      -1.95,
    ],
    resident: [
      4.1,
      0.82,
      -0.35,
    ],
  },
  star_explode: {
    keepsake: [
      4.05,
      0.82,
      2.6,
    ],
    resident: [
      4.35,
      0.82,
      1.15,
    ],
  },
  star_throw: {
    keepsake: [
      1.2,
      0.82,
      3.45,
    ],
    resident: [
      0.95,
      0.82,
      2.15,
    ],
  },
  party_3d: {
    keepsake: [
      -1.55,
      0.82,
      0.0,
    ],
    resident: [
      0.95,
      0.82,
      0.15,
    ],
  },
  party_3d_2: {
    keepsake: [
      2.35,
      0.82,
      -2.45,
    ],
    resident: [
      3.7,
      0.82,
      -3.0,
    ],
  },
  coins_rain: {
    keepsake: [
      2.65,
      0.82,
      3.65,
    ],
    resident: [
      3.55,
      0.82,
      3.55,
    ],
  },
  reading_buddy: {
    keepsake: [
      -0.75,
      0.82,
      -2.1,
    ],
    resident: [
      0.75,
      0.82,
      -2.25,
    ],
  },
};

const FALLBACK_DISCOVERY_ZONE_SLOTS: Record<
  Island3DZone,
  Vec3[]
> = {
  grove: [
    [-4.0, 0.82, 0.55],
    [-3.2, 0.82, 1.55],
    [-3.7, 0.82, -1.75],
    [-2.55, 0.82, -1.35],
  ],
  garden: [
    [-3.55, 0.82, 2.65],
    [-2.35, 0.82, 3.7],
    [-1.15, 0.82, 3.85],
  ],
  library: [
    [-0.85, 0.82, -2.15],
    [0.75, 0.82, -2.25],
    [1.25, 0.82, -0.25],
  ],
  waterfall: [
    [4.0, 0.82, 2.65],
    [4.35, 0.82, 1.15],
    [2.65, 0.82, 3.65],
    [3.55, 0.82, 3.55],
  ],
  observatory: [
    [4.25, 0.82, -1.95],
    [4.1, 0.82, -0.35],
    [2.35, 0.82, -2.45],
    [3.7, 0.82, -3.0],
  ],
  habitat: [
    [0.0, 0.82, -3.75],
    [1.55, 0.82, -4.05],
    [2.65, 0.82, -3.55],
  ],
  open_grass: [
    [-1.55, 0.82, 0.0],
    [0.95, 0.82, 0.15],
    [-1.25, 0.82, 3.65],
    [0.05, 0.82, 4.05],
    [1.2, 0.82, 3.45],
    [0.95, 0.82, 2.15],
  ],
};

function discoveryWorldPosition(
  discovery: Island3DDiscovery,
  visualKey: FriendshipVisualKey | null,
  fallbackIndex: number
): Vec3 {
  if (visualKey) {
    return FRIENDSHIP_DISCOVERY_POSITIONS[
      visualKey
    ][discovery.kind];
  }

  const slots =
    FALLBACK_DISCOVERY_ZONE_SLOTS[
      discovery.zone
    ];

  if (
    slots &&
    slots.length > 0
  ) {
    return slots[
      fallbackIndex %
        slots.length
    ];
  }

  const base =
    DISCOVERY_ZONE_POSITIONS[
      discovery.zone
    ];

  const angle =
    fallbackIndex * 1.79;

  const offset =
    0.5 +
    (fallbackIndex % 3) *
      0.2;

  return [
    base[0] +
      Math.cos(angle) *
        offset,
    base[1],
    base[2] +
      Math.sin(angle) *
        offset,
  ];
}

function residentDisplayScale(
  visualKey: FriendshipVisualKey | null
): number {
  switch (visualKey) {
    case "balloons":
      return 0.46;
    case "hearts":
      return 0.5;
    case "sleepy_moon":
      return 0.52;
    case "star_throw":
      return 0.74;
    case "party_3d":
    case "party_3d_2":
      return 0.52;
    case "coins_rain":
      return 0.54;
    default:
      return 0.56;
  }
}

function MiniStar({
  position = [0, 0, 0],
  scale = 1,
  color = "#fde68a",
}: {
  position?: Vec3;
  scale?: number;
  color?: string;
}) {
  return (
    <mesh
      position={position}
      rotation={[0, 0, Math.PI / 4]}
      scale={[0.12 * scale, 0.12 * scale, 0.06 * scale]}
    >
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.55}
        roughness={0.28}
      />
    </mesh>
  );
}

function MiniHeart({
  position = [0, 0, 0],
  scale = 1,
  color = "#f472b6",
}: {
  position?: Vec3;
  scale?: number;
  color?: string;
}) {
  return (
    <group position={position} scale={scale}>
      {[-0.075, 0.075].map((x) => (
        <mesh
          key={x}
          position={[x, 0.055, 0]}
          scale={[0.1, 0.1, 0.07]}
        >
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.26}
            roughness={0.48}
          />
        </mesh>
      ))}

      <mesh
        position={[0, -0.055, 0]}
        rotation={[0, 0, Math.PI / 4]}
        scale={[0.115, 0.115, 0.075]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.26}
          roughness={0.48}
        />
      </mesh>
    </group>
  );
}

function MiniFlower({
  position,
  color,
}: {
  position: Vec3;
  color: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.012, 0.018, 0.2, 7]} />
        <meshStandardMaterial color="#3f9b63" roughness={0.9} />
      </mesh>

      <mesh
        position={[0, 0.22, 0]}
        rotation={[0, 0, Math.PI / 4]}
        scale={[0.07, 0.07, 0.045]}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.34}
        />
      </mesh>
    </group>
  );
}

function MiniBalloon({
  position,
  color,
  scale = 1,
}: {
  position: Vec3;
  color: string;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh scale={[0.17, 0.22, 0.15]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.12}
          roughness={0.4}
        />
      </mesh>

      <mesh
        position={[0, -0.18, 0]}
        rotation={[0, 0, Math.PI / 4]}
        scale={[0.04, 0.04, 0.03]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.48, 6]} />
        <meshBasicMaterial
          color="#f8fafc"
          transparent
          opacity={0.78}
        />
      </mesh>
    </group>
  );
}

function MiniBook({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  cover = "#3b82f6",
}: {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  cover?: string;
}) {
  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
    >
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[side * 0.105, 0, 0]}
            rotation={[0, 0, side * 0.15]}
          >
            <boxGeometry args={[0.22, 0.045, 0.32]} />
            <meshStandardMaterial
              color={cover}
              roughness={0.64}
            />
          </mesh>

          <mesh
            position={[side * 0.097, 0.027, 0]}
            rotation={[0, 0, side * 0.15]}
          >
            <boxGeometry args={[0.195, 0.018, 0.29]} />
            <meshStandardMaterial
              color="#fff7dc"
              roughness={0.92}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function MiniCoin({
  position,
  rotation = [Math.PI / 2, 0, 0],
  scale = 1,
}: {
  position: Vec3;
  rotation?: Vec3;
  scale?: number;
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <cylinderGeometry args={[0.1, 0.1, 0.035, 20]} />
      <meshStandardMaterial
        color="#facc15"
        emissive="#ca8a04"
        emissiveIntensity={0.2}
        metalness={0.72}
        roughness={0.24}
      />
    </mesh>
  );
}

function BunnyBurrowKeepsake() {
  return (
    <group scale={0.9}>
      <mesh
        position={[0, 0.22, 0]}
        scale={[0.76, 0.44, 0.62]}
      >
        <sphereGeometry args={[0.62, 22, 16]} />
        <meshStandardMaterial color="#4e9f61" roughness={0.96} />
      </mesh>

      <mesh position={[0, 0.2, 0.5]}>
        <circleGeometry args={[0.2, 24]} />
        <meshStandardMaterial color="#231815" roughness={1} />
      </mesh>

      <mesh position={[0, 0.2, 0.51]}>
        <ringGeometry args={[0.19, 0.25, 24]} />
        <meshStandardMaterial color="#78513b" roughness={0.92} />
      </mesh>

      <MiniFlower
        position={[-0.44, 0.02, 0.2]}
        color="#f9a8d4"
      />
      <MiniFlower
        position={[0.43, 0.02, 0.16]}
        color="#fde68a"
      />
      <MiniFlower
        position={[-0.14, 0.02, -0.35]}
        color="#c4b5fd"
      />

      {[-0.2, 0.16].map((x, index) => (
        <group
          key={x}
          position={[x, 0.018, 0.7 + index * 0.06]}
          rotation={[-Math.PI / 2, 0, index * 0.4]}
        >
          {[-0.04, 0.04].map((toe) => (
            <mesh
              key={toe}
              position={[toe, 0.025, 0]}
              scale={[0.028, 0.05, 0.025]}
            >
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial color="#6b4a36" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function BalloonArchKeepsake() {
  const balloons = [
    [-0.62, 0.22, "#38bdf8"],
    [-0.58, 0.52, "#f472b6"],
    [-0.48, 0.82, "#facc15"],
    [-0.29, 1.05, "#a78bfa"],
    [0, 1.16, "#34d399"],
    [0.29, 1.05, "#fb7185"],
    [0.48, 0.82, "#60a5fa"],
    [0.58, 0.52, "#f0abfc"],
    [0.62, 0.22, "#fde68a"],
  ] as Array<[number, number, string]>;

  return (
    <group scale={0.76}>
      {balloons.map(([x, y, color], index) => (
        <MiniBalloon
          key={index}
          position={[x, y, 0]}
          color={color}
          scale={1.08}
        />
      ))}

      {[-0.67, 0.67].map((x) => (
        <mesh key={x} position={[x, 0.38, -0.03]}>
          <cylinderGeometry args={[0.035, 0.05, 0.78, 10]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}
    </group>
  );
}

function FriendshipBenchKeepsake() {
  return (
    <group scale={0.8}>
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[1.25, 0.18, 0.42]} />
        <meshStandardMaterial color="#9b6848" roughness={0.84} />
      </mesh>

      <mesh
        position={[0, 0.74, -0.16]}
        rotation={[-0.1, 0, 0]}
      >
        <boxGeometry args={[1.25, 0.56, 0.14]} />
        <meshStandardMaterial color="#a87150" roughness={0.84} />
      </mesh>

      {[-0.48, 0.48].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.14, 0]}>
            <boxGeometry args={[0.12, 0.45, 0.34]} />
            <meshStandardMaterial color="#5c4034" />
          </mesh>

          <MiniHeart
            position={[x, 0.82, -0.06]}
            scale={0.7}
            color={x < 0 ? "#f472b6" : "#c084fc"}
          />
        </group>
      ))}

      <MiniFlower position={[-0.72, 0, 0.12]} color="#f9a8d4" />
      <MiniFlower position={[0.72, 0, 0.08]} color="#c4b5fd" />
      <MiniFlower position={[0.12, 0, -0.42]} color="#fde68a" />
    </group>
  );
}

function MoonlitHammockKeepsake() {
  const hammock = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (hammock.current) {
      hammock.current.rotation.z =
        Math.sin(clock.elapsedTime * 0.7) * 0.035;
    }
  });

  return (
    <group scale={0.82}>
      {[-0.68, 0.68].map((x) => (
        <mesh key={x} position={[x, 0.68, 0]}>
          <cylinderGeometry args={[0.055, 0.08, 1.38, 10]} />
          <meshStandardMaterial color="#72513b" roughness={0.9} />
        </mesh>
      ))}

      <group ref={hammock} position={[0, 0.52, 0]}>
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1, 0.34, 1]}
        >
          <torusGeometry args={[0.66, 0.13, 12, 34, Math.PI]} />
          <meshStandardMaterial
            color="#7c6cad"
            emissive="#4c1d95"
            emissiveIntensity={0.18}
            roughness={0.68}
          />
        </mesh>

        <mesh
          position={[-0.24, 0.06, 0.04]}
          rotation={[0, 0, -0.22]}
          scale={[0.18, 0.11, 0.08]}
        >
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial
            color="#fde68a"
            emissive="#facc15"
            emissiveIntensity={0.18}
          />
        </mesh>

        <mesh
          position={[0.2, -0.02, 0.06]}
          scale={[0.32, 0.06, 0.24]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#c4b5fd"
            emissive="#7c3aed"
            emissiveIntensity={0.12}
          />
        </mesh>
      </group>

      <MiniStar
        position={[0.12, 0.6, 0.2]}
        scale={0.6}
        color="#fef08a"
      />
    </group>
  );
}

function BurstCrystalClusterKeepsake({
  accent,
}: {
  accent: string;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (group.current) {
      const pulse =
        1 + Math.sin(clock.elapsedTime * 2.1) * 0.045;

      group.current.scale.set(pulse, pulse, pulse);
    }
  });

  const crystals = [
    [-0.3, 0.34, 0, 0.62, accent],
    [0, 0.5, 0, 0.9, "#fde68a"],
    [0.3, 0.3, 0.04, 0.55, "#f472b6"],
    [-0.13, 0.22, 0.28, 0.45, "#67e8f9"],
    [0.16, 0.2, -0.25, 0.42, "#c4b5fd"],
  ] as Array<[number, number, number, number, string]>;

  return (
    <group ref={group} scale={0.9}>
      {crystals.map(([x, y, z, height, color], index) => (
        <mesh
          key={index}
          position={[x, y, z]}
          rotation={[0, index * 0.7, index % 2 ? -0.18 : 0.16]}
          scale={[0.28, height, 0.28]}
        >
          <octahedronGeometry args={[0.56, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.62}
            metalness={0.32}
            roughness={0.2}
          />
        </mesh>
      ))}

      <mesh
        position={[0, 0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.52, 0.72, 34]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.24}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function StarTossTargetKeepsake() {
  const targetRing = useRef<THREE.Mesh>(null);
  const impactRing = useRef<THREE.Mesh>(null);
  const thrownStar = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;

    if (targetRing.current) {
      targetRing.current.rotation.z += delta * 0.42;
    }

    if (impactRing.current) {
      const pulse =
        1 + Math.max(0, Math.sin(time * 2.4)) * 0.22;
      impactRing.current.scale.set(pulse, pulse, pulse);
      const material =
        impactRing.current.material as THREE.MeshBasicMaterial;
      material.opacity =
        0.12 +
        Math.max(0, Math.sin(time * 2.4)) * 0.38;
    }

    if (thrownStar.current) {
      const cycle = (time * 0.42) % 1;
      const eased = 1 - Math.pow(1 - cycle, 2);
      thrownStar.current.position.set(
        1.45 - eased * 1.45,
        1.35 - eased * 0.76 + Math.sin(cycle * Math.PI) * 0.42,
        0.72 - eased * 0.68
      );
      thrownStar.current.rotation.z += delta * 4.2;
      thrownStar.current.rotation.y += delta * 2.4;
      const starScale =
        cycle > 0.9 ? Math.max(0.2, (1 - cycle) * 10) : 1;
      thrownStar.current.scale.setScalar(starScale);
    }
  });

  return (
    <group scale={0.9}>
      {/* Weighted stand and base. */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.06, 0.085, 1.15, 10]} />
        <meshStandardMaterial
          color="#475569"
          metalness={0.48}
          roughness={0.34}
        />
      </mesh>

      <mesh position={[0, -0.34, 0]}>
        <cylinderGeometry args={[0.34, 0.44, 0.14, 20]} />
        <meshStandardMaterial color="#334155" roughness={0.62} />
      </mesh>

      {/* Glowing target board. */}
      <mesh
        position={[0, 0.72, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.62, 0.62, 0.12, 40]} />
        <meshStandardMaterial
          color="#1d4ed8"
          emissive="#1e40af"
          emissiveIntensity={0.35}
          metalness={0.24}
          roughness={0.32}
        />
      </mesh>

      <mesh
        ref={targetRing}
        position={[0, 0.79, 0.02]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.46, 0.055, 12, 42]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#0891b2"
          emissiveIntensity={1.15}
        />
      </mesh>

      <mesh
        position={[0, 0.8, 0.03]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.25, 0.042, 10, 36]} />
        <meshStandardMaterial
          color="#fde68a"
          emissive="#facc15"
          emissiveIntensity={0.75}
        />
      </mesh>

      <group position={[0, 0.8, 0.1]}>
        <MiniStar scale={1.65} color="#fff3a8" />
      </group>

      {/* Expanding impact ripple makes the target feel like it was just hit. */}
      <mesh
        ref={impactRing}
        position={[0, 0.81, 0.09]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.68, 0.025, 8, 40]} />
        <meshBasicMaterial
          color="#fef08a"
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      {/* A star repeatedly flies into the target. */}
      <group ref={thrownStar}>
        <MiniStar scale={1.0} color="#ffffff" />
      </group>

      <pointLight
        position={[0, 0.84, 0.45]}
        color="#67e8f9"
        intensity={0.45}
        distance={3}
      />
    </group>
  );
}

function PartyPlatformKeepsake() {
  const ring = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ring.current) {
      ring.current.rotation.z += delta * 0.24;
    }
  });

  return (
    <group scale={0.82}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.68, 0.78, 0.24, 28]} />
        <meshStandardMaterial
          color="#7e3551"
          emissive="#be185d"
          emissiveIntensity={0.2}
          roughness={0.44}
        />
      </mesh>

      <mesh
        ref={ring}
        position={[0, 0.255, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.56, 0.045, 10, 36]} />
        <meshBasicMaterial color="#fda4af" />
      </mesh>

      {[-0.72, 0.72].map((x) => (
        <group key={x} position={[x, 0.75, 0]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.045, 1.05, 8]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>

          <mesh
            position={[0, 0.5, 0]}
            rotation={[0, 0, x < 0 ? -0.2 : 0.2]}
          >
            <coneGeometry args={[0.18, 0.36, 3]} />
            <meshStandardMaterial
              color={x < 0 ? "#38bdf8" : "#facc15"}
              emissive={x < 0 ? "#0284c7" : "#ca8a04"}
              emissiveIntensity={0.18}
            />
          </mesh>
        </group>
      ))}

      {[
        [-0.42, 0.5, 0.26, "#38bdf8"],
        [0, 0.58, 0.28, "#facc15"],
        [0.42, 0.5, 0.26, "#f472b6"],
      ].map(([x, y, z, color], index) => (
        <mesh
          key={index}
          position={[x as number, y as number, z as number]}
          rotation={[0, 0, index * 0.55]}
          scale={[0.07, 0.12, 0.04]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={color as string} />
        </mesh>
      ))}
    </group>
  );
}

function NeonPartyLanternKeepsake() {
  const ring = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (ring.current) {
      ring.current.rotation.z += delta * 0.62;
    }

    if (core.current) {
      core.current.rotation.y -= delta * 0.4;

      const pulse =
        1 + Math.sin(clock.elapsedTime * 2.2) * 0.05;

      core.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group scale={0.78}>
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.36, 0.44, 0.88, 8]} />
        <meshStandardMaterial
          color="#38205f"
          emissive="#7c3aed"
          emissiveIntensity={0.36}
          metalness={0.35}
          roughness={0.3}
        />
      </mesh>

      <mesh
        ref={ring}
        position={[0, 0.7, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.34, 0.055, 10, 32]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>

      <group ref={core} position={[0, 0.48, 0]}>
        <MiniStar position={[0, 0.18, 0.31]} color="#f472b6" />
        <MiniStar position={[-0.23, -0.08, 0.18]} color="#67e8f9" />
        <MiniStar position={[0.23, -0.06, -0.16]} color="#facc15" />
      </group>

      <pointLight
        position={[0, 0.55, 0]}
        color="#c084fc"
        intensity={0.5}
        distance={2.8}
      />
    </group>
  );
}

function CoinWishingWellKeepsake() {
  const water = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (water.current) {
      const pulse =
        1 + Math.sin(clock.elapsedTime * 2) * 0.04;

      water.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group scale={0.72}>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.58, 0.66, 0.72, 18]} />
        <meshStandardMaterial color="#7c8793" roughness={0.92} />
      </mesh>

      <mesh
        ref={water}
        position={[0, 0.76, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.42, 28]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#0891b2"
          emissiveIntensity={0.65}
          transparent
          opacity={0.86}
        />
      </mesh>

      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 1.12, 0]}>
          <cylinderGeometry args={[0.055, 0.07, 1.28, 10]} />
          <meshStandardMaterial color="#74513a" roughness={0.88} />
        </mesh>
      ))}

      <mesh
        position={[0, 1.72, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.055, 0.055, 1.38, 10]} />
        <meshStandardMaterial color="#74513a" roughness={0.88} />
      </mesh>

      <MiniCoin position={[-0.54, 0.08, 0.4]} scale={0.9} />
      <MiniCoin
        position={[-0.36, 0.09, 0.54]}
        rotation={[1.1, 0.2, 0]}
        scale={0.82}
      />
      <MiniCoin position={[0.46, 0.08, 0.45]} scale={0.76} />
    </group>
  );
}

function ReadingNookKeepsake() {
  return (
    <group scale={0.86}>
      <mesh
        position={[0, 0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.72, 28]} />
        <meshStandardMaterial
          color="#7c6cad"
          emissive="#4c1d95"
          emissiveIntensity={0.1}
          roughness={0.92}
        />
      </mesh>

      <MiniBook
        position={[0.08, 0.18, 0.08]}
        rotation={[-0.08, 0.45, 0.08]}
        scale={1.05}
        cover="#34d399"
      />

      {[
        [-0.4, 0.12, 0.12, "#f472b6"],
        [-0.32, 0.25, 0.08, "#3b82f6"],
        [-0.24, 0.38, 0.02, "#facc15"],
      ].map(([x, y, z, cover], index) => (
        <mesh
          key={index}
          position={[x as number, y as number, z as number]}
          rotation={[0, 0.25, -0.05]}
        >
          <boxGeometry args={[0.4, 0.13, 0.5]} />
          <meshStandardMaterial
            color={cover as string}
            roughness={0.68}
          />
        </mesh>
      ))}

      <group position={[0.5, 0.5, -0.08]}>
        <mesh>
          <cylinderGeometry args={[0.035, 0.05, 0.95, 9]} />
          <meshStandardMaterial color="#5b4638" />
        </mesh>

        <mesh
          position={[0, 0.46, 0]}
          rotation={[0, 0, Math.PI]}
        >
          <coneGeometry args={[0.22, 0.34, 18]} />
          <meshStandardMaterial
            color="#fde68a"
            emissive="#facc15"
            emissiveIntensity={0.45}
          />
        </mesh>

        <pointLight
          position={[0, 0.34, 0]}
          color="#fde68a"
          intensity={0.4}
          distance={2}
        />
      </group>
    </group>
  );
}

function FriendshipKeepsakeVisual({
  visualKey,
  accent,
}: {
  visualKey: FriendshipVisualKey | null;
  accent: string;
}) {
  switch (visualKey) {
    case "nova_bunny":
      return <BunnyBurrowKeepsake />;

    case "balloons":
      return <BalloonArchKeepsake />;

    case "hearts":
      return <FriendshipBenchKeepsake />;

    case "sleepy_moon":
      return <MoonlitHammockKeepsake />;

    case "star_blow":
      return <StarWindChime accent={accent} />;

    case "star_explode":
      return <BurstCrystalClusterKeepsake accent={accent} />;

    case "star_throw":
      return <StarTossTargetKeepsake />;

    case "party_3d":
      return <PartyPlatformKeepsake />;

    case "party_3d_2":
      return <NeonPartyLanternKeepsake />;

    case "coins_rain":
      return <CoinWishingWellKeepsake />;

    case "reading_buddy":
      return <ReadingNookKeepsake />;

    default:
      return (
        <mesh position={[0, 0.25, 0]}>
          <octahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.68}
            metalness={0.22}
            roughness={0.28}
          />
        </mesh>
      );
  }
}

type CompanionAmbientAction =
  | "jump"
  | "spin"
  | "star_shot"
  | "read"
  | "heart_pop"
  | "dream"
  | "coin_burst"
  | "balloon_bob"
  | "party_burst"
  | "blow_star"
  | "star_burst";

const COMPANION_ACTION_POOLS: Partial<
  Record<
    FriendshipVisualKey,
    CompanionAmbientAction[]
  >
> = {
  star_throw: ["jump", "spin", "star_shot", "read"],
  nova_bunny: ["jump", "spin", "heart_pop", "read"],
  sleepy_moon: ["jump", "spin", "dream", "read"],
  balloons: ["balloon_bob", "spin", "jump"],
  hearts: ["heart_pop", "spin", "jump"],
  star_blow: ["blow_star", "spin", "jump"],
  star_explode: ["star_burst", "jump", "spin"],
  party_3d: ["party_burst", "spin", "jump"],
  party_3d_2: ["party_burst", "spin", "jump"],
  coins_rain: ["coin_burst", "spin", "jump"],
  reading_buddy: ["read", "read", "jump", "spin"],
};

function companionActionDuration(
  action: CompanionAmbientAction
): number {
  switch (action) {
    case "read":
      return 6.5;
    case "star_shot":
      return 3.0;
    case "heart_pop":
      return 3.2;
    case "dream":
      return 3.4;
    case "coin_burst":
      return 3.5;
    case "balloon_bob":
      return 4.6;
    case "party_burst":
      return 3.5;
    case "blow_star":
      return 3.0;
    case "star_burst":
      return 3.2;
    case "spin":
      return 1.55;
    case "jump":
    default:
      return 1.15;
  }
}

function FriendshipResidentVisual({
  visualKey,
  accent,
}: {
  visualKey: FriendshipVisualKey | null;
  accent: string;
}) {
  const root = useRef<THREE.Group>(null);
  const detail = useRef<THREE.Group>(null);
  const actionFx = useRef<THREE.Group>(null);
  const bookFx = useRef<THREE.Group>(null);

  const ambientAction =
    useRef<{
      action: CompanionAmbientAction | null;
      startedAt: number;
      endsAt: number;
      nextAt: number;
      hasDoneSignature: boolean;
    }>({
      action: null,
      startedAt: 0,
      endsAt: 0,
      nextAt: 0,
      hasDoneSignature: false,
    });

  useFrame(({ clock }, delta) => {
    if (!root.current) {
      return;
    }

    const time = clock.elapsedTime;

    switch (visualKey) {
      case "nova_bunny": {
        const hop = Math.max(0, Math.sin(time * 1.45));

        root.current.position.y =
          hop * hop * 0.08;

        root.current.rotation.y =
          Math.sin(time * 0.7) * 0.08;

        break;
      }

      case "balloons":
        root.current.position.y =
          0.15 + Math.sin(time * 1.05) * 0.08;
        root.current.rotation.y =
          Math.sin(time * 0.45) * 0.12;
        break;

      case "hearts":
        root.current.position.y =
          0.22 + Math.sin(time * 1.4) * 0.055;
        root.current.rotation.y += delta * 0.26;
        break;

      case "sleepy_moon":
        root.current.position.y =
          0.22 + Math.sin(time * 0.9) * 0.045;
        root.current.rotation.z =
          -0.12 + Math.sin(time * 0.72) * 0.07;
        break;

      case "star_blow":
        root.current.position.y =
          0.18 + Math.sin(time * 1.35) * 0.045;

        if (detail.current) {
          detail.current.position.x =
            0.45 + ((time * 0.28) % 0.7);

          detail.current.rotation.z +=
            delta * 0.8;
        }

        break;

      case "star_explode": {
        /*
         * Preserve the resident's intentionally tiny base scale while giving
         * it an energetic, excited pulse.
         */
        const pulse =
          0.68 *
          (
            1 +
            Math.sin(
              time * 2.4
            ) *
              0.075
          );

        root.current.scale.set(
          pulse,
          pulse,
          pulse
        );

        root.current.rotation.y =
          Math.sin(
            time * 1.15
          ) *
          0.12;

        if (detail.current) {
          detail.current.rotation.z +=
            delta * 1.4;

          detail.current.position.y =
            0.93 +
            Math.sin(
              time * 2.6
            ) *
              0.04;
        }

        break;
      }

      case "star_throw":
        root.current.position.y =
          0.12 + Math.sin(time * 1.5) * 0.04;

        if (detail.current) {
          const angle = time * 1.2;

          detail.current.position.set(
            Math.cos(angle) * 0.5,
            0.5 + Math.sin(angle * 2) * 0.08,
            Math.sin(angle) * 0.3
          );

          detail.current.rotation.z +=
            delta * 1.1;
        }

        break;

      case "party_3d":
        root.current.position.y =
          0.12 +
          Math.max(
            0,
            Math.sin(
              time * 2.2
            )
          ) *
            0.035;
        root.current.rotation.y =
          Math.sin(
            time * 0.8
          ) *
            0.07;

        if (detail.current) {
          detail.current.rotation.y +=
            delta * 0.75;
        }
        break;

      case "party_3d_2":
        root.current.position.y =
          0.12 +
          Math.max(
            0,
            Math.sin(
              time * 2.35
            )
          ) *
            0.04;
        root.current.rotation.y =
          Math.sin(
            time * 0.9
          ) *
            0.08;

        if (detail.current) {
          detail.current.rotation.y +=
            delta * 1.0;
        }
        break;

      case "coins_rain":
        root.current.position.y =
          0.12 + Math.sin(time * 1.45) * 0.045;
        root.current.rotation.y += delta * 0.42;
        break;

      case "reading_buddy":
        root.current.position.y =
          Math.sin(time * 0.8) * 0.018;

        if (detail.current) {
          detail.current.rotation.z =
            Math.sin(time * 0.8) * 0.035;
        }

        break;

      default:
        root.current.position.y =
          0.1 + Math.sin(time * 1.3) * 0.04;
        root.current.rotation.y +=
          delta * 0.2;
    }

    const pool =
      visualKey
        ? COMPANION_ACTION_POOLS[
            visualKey
          ]
        : undefined;

    if (bookFx.current) {
      bookFx.current.visible =
        false;
    }

    if (actionFx.current) {
      actionFx.current.visible =
        false;
    }

    if (
      visualKey ===
        "star_throw" &&
      detail.current
    ) {
      detail.current.visible =
        false;
    }

    if (!pool?.length) {
      return;
    }

    const state =
      ambientAction.current;

    if (state.nextAt <= 0) {
      state.nextAt =
        time +
        3.5 +
        Math.random() *
          4.5;
    }

    if (
      !state.action &&
      time >= state.nextAt
    ) {
      const roll =
        Math.random();

      if (
        visualKey === "star_throw" &&
        !state.hasDoneSignature
      ) {
        state.action = "star_shot";
        state.hasDoneSignature = true;
      } else if (
        visualKey === "nova_bunny" &&
        !state.hasDoneSignature
      ) {
        state.action = "heart_pop";
        state.hasDoneSignature = true;
      } else if (
        visualKey === "sleepy_moon" &&
        !state.hasDoneSignature
      ) {
        state.action = "dream";
        state.hasDoneSignature = true;
      } else if (
        visualKey === "balloons" &&
        !state.hasDoneSignature
      ) {
        state.action = "balloon_bob";
        state.hasDoneSignature = true;
      } else if (
        visualKey === "hearts" &&
        !state.hasDoneSignature
      ) {
        state.action = "heart_pop";
        state.hasDoneSignature = true;
      } else if (
        visualKey === "star_blow" &&
        !state.hasDoneSignature
      ) {
        state.action = "blow_star";
        state.hasDoneSignature = true;
      } else if (
        visualKey === "star_explode" &&
        !state.hasDoneSignature
      ) {
        state.action = "star_burst";
        state.hasDoneSignature = true;
      } else if (
        (visualKey === "party_3d" ||
         visualKey === "party_3d_2") &&
        !state.hasDoneSignature
      ) {
        state.action = "party_burst";
        state.hasDoneSignature = true;
      } else if (
        visualKey === "coins_rain" &&
        !state.hasDoneSignature
      ) {
        state.action = "coin_burst";
        state.hasDoneSignature = true;
      } else if (
        visualKey === "reading_buddy" &&
        !state.hasDoneSignature
      ) {
        state.action = "read";
        state.hasDoneSignature = true;
      } else if (visualKey === "star_throw") {
        state.action = roll < 0.50 ? "star_shot" : roll < 0.78 ? "read" : roll < 0.89 ? "jump" : "spin";
      } else if (visualKey === "nova_bunny") {
        state.action = roll < 0.48 ? "heart_pop" : roll < 0.74 ? "read" : roll < 0.88 ? "jump" : "spin";
      } else if (visualKey === "sleepy_moon") {
        state.action = roll < 0.50 ? "dream" : roll < 0.76 ? "read" : roll < 0.89 ? "jump" : "spin";
      } else if (visualKey === "balloons") {
        state.action = roll < 0.68 ? "balloon_bob" : roll < 0.84 ? "spin" : "jump";
      } else if (visualKey === "hearts") {
        state.action = roll < 0.68 ? "heart_pop" : roll < 0.84 ? "spin" : "jump";
      } else if (visualKey === "star_blow") {
        state.action = roll < 0.68 ? "blow_star" : roll < 0.84 ? "spin" : "jump";
      } else if (visualKey === "star_explode") {
        state.action = roll < 0.70 ? "star_burst" : roll < 0.85 ? "jump" : "spin";
      } else if (
        visualKey === "party_3d" ||
        visualKey === "party_3d_2"
      ) {
        state.action = roll < 0.68 ? "party_burst" : roll < 0.84 ? "spin" : "jump";
      } else if (visualKey === "coins_rain") {
        state.action = roll < 0.70 ? "coin_burst" : roll < 0.85 ? "spin" : "jump";
      } else if (visualKey === "reading_buddy") {
        state.action = roll < 0.72 ? "read" : roll < 0.86 ? "jump" : "spin";
      } else {
        state.action =
          pool[
            Math.floor(
              Math.random() *
                pool.length
            )
          ];
      }

      state.startedAt = time;
      state.endsAt =
        time +
        companionActionDuration(
          state.action
        );
    }

    if (!state.action) {
      root.current.rotation.x =
        0;
      return;
    }

    if (time >= state.endsAt) {
      state.action = null;
      state.startedAt = 0;
      state.endsAt = 0;
      state.nextAt =
        time +
        4.5 +
        Math.random() *
          7.5;
      return;
    }

    const duration =
      Math.max(
        0.01,
        state.endsAt -
          state.startedAt
      );

    const progress =
      Math.max(
        0,
        Math.min(
          1,
          (
            time -
            state.startedAt
          ) /
            duration
        )
      );

    switch (state.action) {
      case "jump":
        root.current.position.y +=
          Math.sin(
            progress *
              Math.PI
          ) *
          0.28;
        break;

      case "spin":
        root.current.rotation.y +=
          delta * 6.8;
        break;

      case "star_shot":
        if (detail.current) {
          detail.current.visible =
            true;

          const shot =
            THREE.MathUtils.smoothstep(
              progress,
              0.08,
              0.86
            );

          detail.current.position.set(
            0.42 +
              shot * 1.7,
            0.92 +
              Math.sin(
                progress *
                  Math.PI
              ) *
                0.62,
            0.1
          );

          const shotScale =
            1.0 +
            Math.sin(
              progress *
                Math.PI
            ) *
              0.75;

          detail.current.scale.setScalar(
            shotScale
          );

          detail.current.rotation.z +=
            delta * 7.5;
          detail.current.rotation.y +=
            delta * 4.2;
        }
        break;

      case "read":
        if (bookFx.current) {
          bookFx.current.visible =
            true;

          bookFx.current.position.y =
            0.48 +
            Math.sin(
              time * 1.8
            ) *
              0.025;

          bookFx.current.rotation.z =
            Math.sin(
              time * 0.9
            ) *
              0.045;
        }

        root.current.rotation.x =
          -0.08 +
          Math.sin(
            time * 0.7
          ) *
            0.02;
        break;

      case "heart_pop":
        if (actionFx.current) {
          actionFx.current.visible =
            true;

          const pulse =
            0.72 +
            Math.sin(
              progress *
                Math.PI
            ) *
              0.62;

          actionFx.current.scale.setScalar(
            pulse
          );

          actionFx.current.position.y =
            0.78 +
            progress *
              0.5;
        }
        break;

      case "dream":
        if (actionFx.current) {
          actionFx.current.visible =
            true;

          actionFx.current.position.y =
            0.6 +
            progress *
              0.35;

          actionFx.current.rotation.y +=
            delta * 0.8;

          const dreamPulse =
            0.84 +
            Math.sin(
              progress *
                Math.PI *
                2
            ) *
              0.12;

          actionFx.current.scale.setScalar(
            dreamPulse
          );
        }

      case "coin_burst":
        if (actionFx.current) {
          actionFx.current.visible = true;
          actionFx.current.rotation.y += delta * 3.4;
          actionFx.current.scale.setScalar(
            0.82 +
            Math.sin(progress * Math.PI) * 0.55
          );
          actionFx.current.position.y =
            0.18 +
            Math.sin(progress * Math.PI) * 0.5;
        }
        root.current.rotation.y += delta;
        break;

      case "balloon_bob":
        root.current.position.y +=
          Math.sin(progress * Math.PI) * 0.58;
        root.current.rotation.z =
          Math.sin(progress * Math.PI * 2) * 0.12;
        break;

      case "party_burst":
        if (actionFx.current) {
          actionFx.current.visible = true;
          actionFx.current.rotation.y += delta * 4.2;
          actionFx.current.rotation.z += delta * 2.0;
          actionFx.current.scale.setScalar(
            0.8 +
            Math.sin(progress * Math.PI) * 0.7
          );
        }
        root.current.rotation.y += delta * 2.8;
        break;

      case "blow_star":
        if (detail.current) {
          detail.current.visible = true;
          const blown =
            THREE.MathUtils.smoothstep(
              progress,
              0.08,
              0.9
            );
          detail.current.position.set(
            0.38 + blown * 1.35,
            0.34 +
              Math.sin(progress * Math.PI) * 0.34,
            0.34
          );
          detail.current.rotation.z += delta * 6.0;
        }
        break;

      case "star_burst":
        if (detail.current) {
          detail.current.visible = true;
          detail.current.rotation.z += delta * 7.0;
          detail.current.rotation.y += delta * 4.0;
          detail.current.scale.setScalar(
            0.8 +
            Math.sin(progress * Math.PI) * 1.15
          );
        }
        break;
        break;
    }
  });

  const eyes = (
    <>
      {[-0.13, 0.13].map((x) => (
        <mesh
          key={x}
          position={[x, 0.42, 0.31]}
          scale={[0.045, 0.065, 0.025]}
        >
          <sphereGeometry args={[1, 12, 10]} />
          <meshBasicMaterial color="#201827" />
        </mesh>
      ))}
    </>
  );

  switch (visualKey) {
    case "nova_bunny":
      return (
        <group ref={root} scale={0.62}>
          <mesh
            position={[0, 0.34, 0]}
            scale={[0.46, 0.55, 0.42]}
          >
            <sphereGeometry args={[0.62, 20, 16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.8} />
          </mesh>

          <mesh
            position={[0, 0.86, 0.08]}
            scale={[0.55, 0.5, 0.5]}
          >
            <sphereGeometry args={[0.62, 20, 16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.8} />
          </mesh>

          {[-0.2, 0.2].map((x) => (
            <group key={x}>
              <mesh
                position={[x, 1.35, 0.02]}
                scale={[0.17, 0.54, 0.16]}
              >
                <capsuleGeometry args={[0.3, 0.7, 8, 12]} />
                <meshStandardMaterial
                  color="#f8fafc"
                  emissive={accent}
                  emissiveIntensity={0.08}
                />
              </mesh>

              <mesh
                position={[x, 1.36, 0.17]}
                scale={[0.075, 0.4, 0.035]}
              >
                <capsuleGeometry args={[0.3, 0.7, 8, 12]} />
                <meshStandardMaterial color="#f9a8d4" />
              </mesh>
            </group>
          ))}

          {[-0.18, 0.18].map((x) => (
            <mesh
              key={x}
              position={[x, 0.92, 0.42]}
              scale={[0.06, 0.085, 0.025]}
            >
              <sphereGeometry args={[1, 12, 10]} />
              <meshBasicMaterial color="#1f1720" />
            </mesh>
          ))}

          <mesh
            position={[0, 0.79, 0.48]}
            scale={[0.07, 0.045, 0.03]}
          >
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial
              color={accent}
              emissive={accent}
              emissiveIntensity={0.26}
            />
          </mesh>
                  {/* Ambient action: heart pop */}
          <group
            ref={actionFx}
            visible={false}
            position={[
              0,
              0.82,
              0.08,
            ]}
          >
            <MiniHeart
              scale={0.52}
              color="#f9a8d4"
            />
            <MiniHeart
              position={[
                -0.28,
                0.18,
                0,
              ]}
              scale={0.3}
              color="#c084fc"
            />
            <MiniHeart
              position={[
                0.27,
                0.12,
                0,
              ]}
              scale={0.28}
              color="#fb7185"
            />
          </group>

          {/* Ambient action: bunny reading */}
          <group
            ref={bookFx}
            visible={false}
            position={[
              0,
              0.48,
              0.38,
            ]}
            rotation={[
              -0.35,
              0,
              0,
            ]}
          >
            <MiniBook
              scale={0.74}
              cover="#3b82f6"
            />
          </group>

</group>
      );

    case "balloons":
      return (
        <group ref={root} scale={0.72}>
          <MiniBalloon
            position={[-0.28, 0.55, 0.04]}
            color={accent}
            scale={1.15}
          />
          <MiniBalloon
            position={[0, 0.78, -0.03]}
            color="#f472b6"
            scale={1.22}
          />
          <MiniBalloon
            position={[0.28, 0.54, 0.06]}
            color="#facc15"
            scale={1.08}
          />
          <MiniBalloon
            position={[-0.1, 0.34, 0.12]}
            color="#34d399"
          />
          <MiniBalloon
            position={[0.18, 0.27, -0.08]}
            color="#a78bfa"
          />
        </group>
      );

    case "hearts":
      return (
        <group ref={root} scale={0.82}>
          <MiniHeart
            position={[0, 0.34, 0]}
            scale={1.45}
            color={accent}
          />
          <MiniHeart
            position={[-0.34, 0.65, 0.04]}
            scale={0.62}
            color="#c084fc"
          />
          <MiniHeart
            position={[0.34, 0.62, -0.05]}
            scale={0.55}
            color="#f9a8d4"
          />
        </group>
      );

    case "sleepy_moon":
      return (
        <group ref={root} scale={0.72}>
          <mesh
            position={[0, 0.4, 0]}
            scale={[0.62, 0.62, 0.46]}
          >
            <sphereGeometry args={[0.62, 22, 18]} />
            <meshStandardMaterial
              color="#fde68a"
              emissive={accent}
              emissiveIntensity={0.22}
              roughness={0.56}
            />
          </mesh>

          {[-0.18, 0.18].map((x) => (
            <mesh
              key={x}
              position={[x, 0.48, 0.42]}
              rotation={[0, 0, x < 0 ? 0.18 : -0.18]}
              scale={[0.11, 0.018, 0.02]}
            >
              <sphereGeometry args={[1, 12, 8]} />
              <meshBasicMaterial color="#433344" />
            </mesh>
          ))}

          <mesh
            position={[0, 0.34, 0.46]}
            scale={[0.11, 0.04, 0.02]}
          >
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color="#7c3f55" />
          </mesh>

          <mesh
            position={[-0.12, 0.94, 0]}
            rotation={[0, 0, 0.25]}
          >
            <coneGeometry args={[0.32, 0.62, 18]} />
            <meshStandardMaterial
              color="#8b5cf6"
              emissive="#4c1d95"
              emissiveIntensity={0.24}
            />
          </mesh>

          <mesh position={[-0.28, 1.18, 0]}>
            <sphereGeometry args={[0.11, 14, 10]} />
            <meshStandardMaterial
              color="#f8fafc"
              emissive="#e9d5ff"
              emissiveIntensity={0.24}
            />
          </mesh>
                  {/* Ambient action: dream sparkles */}
          <group
            ref={actionFx}
            visible={false}
            position={[
              0.35,
              0.92,
              0.08,
            ]}
          >
            <MiniStar
              scale={0.46}
              color="#e9d5ff"
            />
            <MiniStar
              position={[
                0.28,
                0.2,
                -0.03,
              ]}
              scale={0.3}
              color="#bfdbfe"
            />
            <MiniStar
              position={[
                -0.18,
                0.34,
                0.04,
              ]}
              scale={0.24}
              color="#fef08a"
            />
          </group>

          {/* Ambient action: moon reading */}
          <group
            ref={bookFx}
            visible={false}
            position={[
              0,
              0.32,
              0.42,
            ]}
            rotation={[
              -0.4,
              0,
              0,
            ]}
          >
            <MiniBook
              scale={0.72}
              cover="#7c3aed"
            />
          </group>

</group>
      );

    case "star_blow":
      return (
        <group ref={root} scale={0.75}>
          <mesh position={[0, 0.38, 0]}>
            <sphereGeometry args={[0.38, 22, 18]} />
            <meshStandardMaterial
              color={accent}
              emissive={accent}
              emissiveIntensity={0.24}
              roughness={0.46}
            />
          </mesh>

          {eyes}

          <mesh
            position={[0.18, 0.31, 0.35]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <torusGeometry args={[0.06, 0.02, 8, 18]} />
            <meshBasicMaterial color="#7c2d52" />
          </mesh>

          <group ref={detail} position={[0.45, 0.33, 0.35]}>
            <MiniStar color="#fff7b2" />
          </group>
        </group>
      );

    case "star_explode":
      return (
        <group
          ref={root}
          position={[
            0,
            0.14,
            0,
          ]}
          scale={0.68}
        >
          {/* Round, soft body instead of the old diamond placeholder. */}
          <mesh
            position={[
              0,
              0.42,
              0,
            ]}
            scale={[
              0.48,
              0.5,
              0.42,
            ]}
          >
            <sphereGeometry
              args={[
                0.72,
                24,
                18,
              ]}
            />
            <meshStandardMaterial
              color="#fbbf24"
              emissive={accent}
              emissiveIntensity={0.34}
              roughness={0.42}
              metalness={0.08}
            />
          </mesh>

          {/* Harmless little energy spikes express the explosive personality. */}
          {[
            [
              0,
              0.95,
              0,
              0,
              0,
              0,
            ],
            [
              -0.5,
              0.55,
              0,
              0,
              0,
              Math.PI / 2,
            ],
            [
              0.5,
              0.55,
              0,
              0,
              0,
              -Math.PI / 2,
            ],
            [
              -0.34,
              0.18,
              0,
              0,
              0,
              2.35,
            ],
            [
              0.34,
              0.18,
              0,
              0,
              0,
              -2.35,
            ],
          ].map(
            (
              [
                x,
                y,
                z,
                rx,
                ry,
                rz,
              ],
              index
            ) => (
              <mesh
                key={index}
                position={[
                  x,
                  y,
                  z,
                ]}
                rotation={[
                  rx,
                  ry,
                  rz,
                ]}
              >
                <coneGeometry
                  args={[
                    0.12,
                    0.3,
                    12,
                  ]}
                />
                <meshStandardMaterial
                  color={
                    index % 2
                      ? "#fb7185"
                      : "#fde68a"
                  }
                  emissive={
                    index % 2
                      ? "#e11d48"
                      : "#facc15"
                  }
                  emissiveIntensity={0.38}
                  roughness={0.36}
                />
              </mesh>
            )
          )}

          {/* Big excited eyes. */}
          {[-0.16, 0.16].map(
            (x) => (
              <group key={x}>
                <mesh
                  position={[
                    x,
                    0.5,
                    0.36,
                  ]}
                  scale={[
                    0.085,
                    0.11,
                    0.035,
                  ]}
                >
                  <sphereGeometry
                    args={[
                      1,
                      14,
                      10,
                    ]}
                  />
                  <meshBasicMaterial
                    color="#2b1722"
                  />
                </mesh>

                <mesh
                  position={[
                    x - 0.018,
                    0.535,
                    0.397,
                  ]}
                  scale={[
                    0.021,
                    0.028,
                    0.012,
                  ]}
                >
                  <sphereGeometry
                    args={[
                      1,
                      10,
                      8,
                    ]}
                  />
                  <meshBasicMaterial
                    color="#ffffff"
                  />
                </mesh>
              </group>
            )
          )}

          {/* Tiny delighted smile and rosy cheeks. */}
          <mesh
            position={[
              0,
              0.36,
              0.395,
            ]}
            rotation={[
              Math.PI / 2,
              0,
              0,
            ]}
            scale={[
              1,
              0.65,
              1,
            ]}
          >
            <torusGeometry
              args={[
                0.075,
                0.018,
                8,
                18,
                Math.PI,
              ]}
            />
            <meshBasicMaterial
              color="#7f1d1d"
            />
          </mesh>

          {[-0.29, 0.29].map(
            (x) => (
              <mesh
                key={x}
                position={[
                  x,
                  0.34,
                  0.34,
                ]}
                scale={[
                  0.07,
                  0.035,
                  0.02,
                ]}
              >
                <sphereGeometry
                  args={[
                    1,
                    12,
                    8,
                  ]}
                />
                <meshBasicMaterial
                  color="#fb7185"
                  transparent
                  opacity={0.75}
                />
              </mesh>
            )
          )}

          {/* A spinning spark floats above its head. */}
          <group
            ref={detail}
            position={[
              0,
              0.93,
              0.05,
            ]}
          >
            <MiniStar
              scale={0.72}
              color="#fff7b2"
            />
          </group>

          <pointLight
            position={[
              0,
              0.55,
              0.15,
            ]}
            color="#facc15"
            intensity={0.25}
            distance={1.8}
          />
        </group>
      );

    case "star_throw":
      return (
        <group
          ref={root}
          scale={0.72}
        >
          {/* Legs */}
          {[-0.13, 0.13].map(
            (x) => (
              <group key={x}>
                <mesh
                  position={[
                    x,
                    0.18,
                    0,
                  ]}
                  scale={[
                    0.085,
                    0.26,
                    0.08,
                  ]}
                >
                  <capsuleGeometry
                    args={[
                      0.45,
                      0.72,
                      6,
                      10,
                    ]}
                  />
                  <meshStandardMaterial
                    color="#f5d0c5"
                    roughness={0.72}
                  />
                </mesh>

                <mesh
                  position={[
                    x,
                    -0.015,
                    0.075,
                  ]}
                  scale={[
                    0.11,
                    0.075,
                    0.17,
                  ]}
                >
                  <sphereGeometry
                    args={[
                      1,
                      12,
                      10,
                    ]}
                  />
                  <meshStandardMaterial
                    color="#7f1d1d"
                    roughness={0.56}
                  />
                </mesh>
              </group>
            )
          )}

          {/* Red dress */}
          <mesh
            position={[
              0,
              0.49,
              0,
            ]}
            scale={[
              0.39,
              0.54,
              0.31,
            ]}
          >
            <coneGeometry
              args={[
                0.72,
                1.02,
                22,
              ]}
            />
            <meshStandardMaterial
              color="#dc2626"
              emissive="#991b1b"
              emissiveIntensity={0.13}
              roughness={0.48}
            />
          </mesh>

          {/* Gold dress trim */}
          <mesh
            position={[
              0,
              0.18,
              0,
            ]}
            rotation={[
              Math.PI / 2,
              0,
              0,
            ]}
          >
            <torusGeometry
              args={[
                0.29,
                0.03,
                8,
                28,
              ]}
            />
            <meshBasicMaterial
              color="#fde68a"
            />
          </mesh>

          {/* Left arm */}
          <mesh
            position={[
              -0.31,
              0.63,
              0.02,
            ]}
            rotation={[
              0,
              0,
              0.52,
            ]}
            scale={[
              0.073,
              0.29,
              0.073,
            ]}
          >
            <capsuleGeometry
              args={[
                0.5,
                0.68,
                6,
                10,
              ]}
            />
            <meshStandardMaterial
              color="#f5d0c5"
              roughness={0.72}
            />
          </mesh>

          {/* Throwing arm raised up */}
          <mesh
            position={[
              0.3,
              0.79,
              0.02,
            ]}
            rotation={[
              0,
              0,
              -0.72,
            ]}
            scale={[
              0.073,
              0.34,
              0.073,
            ]}
          >
            <capsuleGeometry
              args={[
                0.5,
                0.72,
                6,
                10,
              ]}
            />
            <meshStandardMaterial
              color="#f5d0c5"
              roughness={0.72}
            />
          </mesh>

          {/* Hair mass behind head */}
          <mesh
            position={[
              0,
              1.04,
              -0.08,
            ]}
            scale={[
              0.43,
              0.5,
              0.33,
            ]}
          >
            <sphereGeometry
              args={[
                0.62,
                22,
                18,
              ]}
            />
            <meshStandardMaterial
              color="#17131f"
              roughness={0.66}
            />
          </mesh>

          {/* Face */}
          <mesh
            position={[
              0,
              1.05,
              0.105,
            ]}
            scale={[
              0.32,
              0.35,
              0.28,
            ]}
          >
            <sphereGeometry
              args={[
                0.62,
                22,
                18,
              ]}
            />
            <meshStandardMaterial
              color="#f5d0c5"
              roughness={0.74}
            />
          </mesh>

          {/* Long side hair */}
          {[-0.25, 0.25].map(
            (x) => (
              <mesh
                key={x}
                position={[
                  x,
                  0.93,
                  0.025,
                ]}
                scale={[
                  0.13,
                  0.42,
                  0.13,
                ]}
                rotation={[
                  0,
                  0,
                  x < 0
                    ? 0.16
                    : -0.16,
                ]}
              >
                <capsuleGeometry
                  args={[
                    0.42,
                    0.72,
                    6,
                    10,
                  ]}
                />
                <meshStandardMaterial
                  color="#17131f"
                  roughness={0.64}
                />
              </mesh>
            )
          )}

          {/* Intentionally faceless for a clean stylized chibi look. */}

          {/* Star hair accent */}
          <group
            position={[
              -0.27,
              1.37,
              0.02,
            ]}
          >
            <MiniStar
              scale={0.54}
              color="#fde68a"
            />
          </group>

          {/* Glowing star in the throwing hand */}
          <group
            position={[
              0.54,
              1.02,
              0.03,
            ]}
          >
            <MiniStar
              scale={0.62}
              color="#fff3a8"
            />
          </group>

          {/* Animated thrown star */}
          <group
            ref={detail}
            position={[
              0.7,
              0.75,
              0.1,
            ]}
          >
            <MiniStar
              scale={0.48}
              color="#67e8f9"
            />
          </group>

          <pointLight
            position={[
              0.48,
              0.92,
              0.22,
            ]}
            color="#fde68a"
            intensity={0.22}
            distance={2.2}
          />
                  {/* Ambient action: Star Toss reading */}
          <group
            ref={bookFx}
            visible={false}
            position={[
              0,
              0.54,
              0.4,
            ]}
            rotation={[
              -0.38,
              0,
              0,
            ]}
          >
            <MiniBook
              scale={0.7}
              cover="#dc2626"
            />
          </group>

</group>
      );

    case "party_3d":
    case "party_3d_2": {
      const neon =
        visualKey === "party_3d_2";

      const dressColor =
        neon
          ? "#7c3aed"
          : "#dc2626";

      const trimColor =
        neon
          ? "#22d3ee"
          : "#fef08a";

      return (
        <group
          ref={root}
          scale={0.72}
        >
          {[-0.13, 0.13].map(
            (x) => (
              <group key={x}>
                <mesh
                  position={[
                    x,
                    0.18,
                    0,
                  ]}
                  scale={[
                    0.085,
                    0.27,
                    0.08,
                  ]}
                >
                  <capsuleGeometry
                    args={[
                      0.45,
                      0.75,
                      6,
                      10,
                    ]}
                  />
                  <meshStandardMaterial
                    color="#f5d0c5"
                    roughness={0.72}
                  />
                </mesh>

                <mesh
                  position={[
                    x,
                    -0.02,
                    0.06,
                  ]}
                  scale={[
                    0.11,
                    0.08,
                    0.17,
                  ]}
                >
                  <sphereGeometry
                    args={[
                      1,
                      12,
                      10,
                    ]}
                  />
                  <meshStandardMaterial
                    color={
                      neon
                        ? "#1e1b4b"
                        : "#7f1d1d"
                    }
                    roughness={0.55}
                  />
                </mesh>
              </group>
            )
          )}

          {/* Party dress */}
          <mesh
            position={[
              0,
              0.48,
              0,
            ]}
            scale={[
              0.4,
              0.54,
              0.32,
            ]}
          >
            <coneGeometry
              args={[
                0.72,
                1.0,
                22,
              ]}
            />
            <meshStandardMaterial
              color={dressColor}
              emissive={
                neon
                  ? "#4c1d95"
                  : "#991b1b"
              }
              emissiveIntensity={
                neon
                  ? 0.38
                  : 0.12
              }
              roughness={0.5}
            />
          </mesh>

          <mesh
            position={[
              0,
              0.18,
              0,
            ]}
            rotation={[
              Math.PI / 2,
              0,
              0,
            ]}
          >
            <torusGeometry
              args={[
                0.3,
                0.035,
                8,
                28,
              ]}
            />
            <meshBasicMaterial
              color={trimColor}
            />
          </mesh>

          {/* Arms */}
          {[-1, 1].map(
            (side) => (
              <mesh
                key={side}
                position={[
                  side * 0.34,
                  0.62,
                  0.02,
                ]}
                rotation={[
                  0,
                  0,
                  side * -0.58,
                ]}
                scale={[
                  0.075,
                  0.3,
                  0.075,
                ]}
              >
                <capsuleGeometry
                  args={[
                    0.5,
                    0.7,
                    6,
                    10,
                  ]}
                />
                <meshStandardMaterial
                  color="#f5d0c5"
                  roughness={0.72}
                />
              </mesh>
            )
          )}

          {/* Hair behind the head */}
          <mesh
            position={[
              0,
              1.03,
              -0.08,
            ]}
            scale={[
              0.42,
              0.5,
              0.32,
            ]}
          >
            <sphereGeometry
              args={[
                0.62,
                22,
                18,
              ]}
            />
            <meshStandardMaterial
              color="#17131f"
              roughness={0.66}
            />
          </mesh>

          {/* Face */}
          <mesh
            position={[
              0,
              1.05,
              0.11,
            ]}
            scale={[
              0.32,
              0.35,
              0.28,
            ]}
          >
            <sphereGeometry
              args={[
                0.62,
                22,
                18,
              ]}
            />
            <meshStandardMaterial
              color="#f5d0c5"
              roughness={0.74}
            />
          </mesh>

          {/* Side hair */}
          {[-0.25, 0.25].map(
            (x) => (
              <mesh
                key={x}
                position={[
                  x,
                  0.94,
                  0.04,
                ]}
                scale={[
                  0.13,
                  0.4,
                  0.13,
                ]}
                rotation={[
                  0,
                  0,
                  x < 0
                    ? 0.16
                    : -0.16,
                ]}
              >
                <capsuleGeometry
                  args={[
                    0.42,
                    0.7,
                    6,
                    10,
                  ]}
                />
                <meshStandardMaterial
                  color="#17131f"
                  roughness={0.64}
                />
              </mesh>
            )
          )}

          {/* Eyes */}
          {[-0.105, 0.105].map(
            (x) => (
              <group key={x}>
                <mesh
                  position={[
                    x,
                    1.08,
                    0.285,
                  ]}
                  scale={[
                    0.048,
                    0.065,
                    0.025,
                  ]}
                >
                  <sphereGeometry
                    args={[
                      1,
                      12,
                      10,
                    ]}
                  />
                  <meshBasicMaterial
                    color="#261a2b"
                  />
                </mesh>

                <mesh
                  position={[
                    x - 0.012,
                    1.1,
                    0.311,
                  ]}
                  scale={[
                    0.012,
                    0.018,
                    0.009,
                  ]}
                >
                  <sphereGeometry
                    args={[
                      1,
                      8,
                      8,
                    ]}
                  />
                  <meshBasicMaterial
                    color="#ffffff"
                  />
                </mesh>
              </group>
            )
          )}

          <mesh
            position={[
              0,
              0.98,
              0.306,
            ]}
            rotation={[
              Math.PI / 2,
              0,
              0,
            ]}
            scale={[
              1,
              0.65,
              1,
            ]}
          >
            <torusGeometry
              args={[
                0.055,
                0.012,
                7,
                16,
                Math.PI,
              ]}
            />
            <meshBasicMaterial
              color="#9f1239"
            />
          </mesh>

          <group
            position={[
              neon
                ? 0.26
                : -0.27,
              1.37,
              0.02,
            ]}
          >
            <MiniStar
              scale={0.58}
              color={trimColor}
            />
          </group>

          {/* Orbiting celebration stars */}
          <group
            ref={detail}
            position={[
              0,
              0.85,
              0,
            ]}
          >
            <MiniStar
              position={[
                -0.48,
                0.12,
                0,
              ]}
              scale={0.42}
              color="#fde68a"
            />
            <MiniStar
              position={[
                0.46,
                -0.06,
                0.04,
              ]}
              scale={0.34}
              color={
                neon
                  ? "#67e8f9"
                  : "#f9a8d4"
              }
            />
          </group>

          <pointLight
            position={[
              0,
              0.8,
              0.3,
            ]}
            color={trimColor}
            intensity={
              neon
                ? 0.3
                : 0.16
            }
            distance={2.2}
          />
                  {/* Ambient action: party burst */}
          <group
            ref={actionFx}
            visible={false}
            position={[0, 0.76, 0]}
          >
            <MiniStar position={[-0.5, 0.1, 0]} scale={0.42} color="#fde68a" />
            <MiniStar position={[0.48, 0.18, 0.04]} scale={0.38} color="#67e8f9" />
            <MiniHeart position={[0, 0.48, 0]} scale={0.38} color="#f9a8d4" />
          </group>

</group>
      );
    }

    case "coins_rain":
      return (
        <group ref={root} scale={0.78}>
          <MiniCoin
            position={[0, 0.4, 0]}
            rotation={[Math.PI / 2, 0.25, 0]}
            scale={1.7}
          />
          <MiniCoin
            position={[-0.32, 0.65, 0.04]}
            rotation={[1.15, 0, 0.4]}
          />
          <MiniCoin
            position={[0.34, 0.73, -0.06]}
            rotation={[0.8, 0.3, -0.2]}
          />
          <MiniCoin
            position={[0.14, 0.92, 0.08]}
            rotation={[1.4, 0.2, 0]}
            scale={0.8}
          />
                  {/* Ambient action: coin burst */}
          <group
            ref={actionFx}
            visible={false}
            position={[0, 0.52, 0]}
          >
            <MiniCoin position={[-0.46, 0.08, 0]} rotation={[1.1, 0.3, 0]} scale={0.9} />
            <MiniCoin position={[0.45, 0.22, 0.04]} rotation={[0.8, 0.1, 0.5]} scale={1.05} />
            <MiniCoin position={[0, 0.52, -0.05]} rotation={[1.4, 0.2, 0]} scale={0.8} />
          </group>

</group>
      );

    case "reading_buddy":
      return (
        <group ref={root} scale={0.7}>
          <mesh
            position={[0, 0.38, -0.06]}
            scale={[0.48, 0.58, 0.42]}
          >
            <sphereGeometry args={[0.62, 20, 16]} />
            <meshStandardMaterial
              color={accent}
              emissive="#047857"
              emissiveIntensity={0.18}
              roughness={0.72}
            />
          </mesh>

          <mesh
            position={[0, 0.82, 0]}
            scale={[0.42, 0.38, 0.38]}
          >
            <sphereGeometry args={[0.62, 20, 16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.76} />
          </mesh>

          {[-0.14, 0.14].map((x) => (
            <mesh
              key={x}
              position={[x, 0.86, 0.34]}
              scale={[0.045, 0.06, 0.02]}
            >
              <sphereGeometry args={[1, 12, 10]} />
              <meshBasicMaterial color="#1f2937" />
            </mesh>
          ))}

          <group
            ref={detail}
            position={[0, 0.24, 0.36]}
            rotation={[-0.35, 0, 0]}
          >
            <MiniBook scale={1.15} cover="#3b82f6" />
          </group>
        </group>
      );

    default:
      return (
        <group ref={root}>
          <mesh position={[0, 0.28, 0]}>
            <sphereGeometry args={[0.26, 16, 14]} />
            <meshStandardMaterial
              color={accent}
              emissive={accent}
              emissiveIntensity={0.3}
            />
          </mesh>

          <mesh
            position={[0, 0.02, 0]}
            scale={[0.78, 0.48, 0.78]}
          >
            <sphereGeometry args={[0.32, 16, 14]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.72} />
          </mesh>
        </group>
      );
  }
}

function DiscoveryMarker({
  discovery,
  index,
  selected,
  onSelect,
}: {
  discovery: Island3DDiscovery;
  index: number;
  selected: boolean;
  onSelect: (
    discoveryKey: string,
    position: Vec3
  ) => void;
}) {
  const visualKey =
    friendshipVisualKey(
      discovery
    );

  const defaultPosition =
    discoveryWorldPosition(
      discovery,
      visualKey,
      index
    );

  const hasCustomVisual =
    visualKey !== null;

  const residentScale =
    residentDisplayScale(
      visualKey
    );

  const {
    isEditing: builderEditing,
  } = useIslandBuilder();

  const {
    selectPlacement: selectDecorationPlacement,
  } = useIslandDecorations();

  const keepsakes = useIslandKeepsakes();

  useEffect(() => {
    if (discovery.kind !== "keepsake") return;

    keepsakes.registerKeepsake({
      key: discovery.key,
      title: discovery.title,
      accent: discovery.accent,
      defaultTransform: {
        x: defaultPosition[0],
        z: defaultPosition[2],
        rotationY: 0,
        scale: 1,
      },
    });
  }, [
    defaultPosition[0],
    defaultPosition[2],
    discovery.accent,
    discovery.key,
    discovery.kind,
    discovery.title,
    keepsakes.registerKeepsake,
  ]);

  const keepsakePlacement =
    discovery.kind === "keepsake"
      ? keepsakes.getPlacement(discovery.key)
      : null;

  if (
    discovery.kind === "keepsake" &&
    keepsakes.ready &&
    keepsakePlacement &&
    !keepsakePlacement.placed
  ) {
    return null;
  }

  const transform =
    discovery.kind === "keepsake" &&
    keepsakePlacement
      ? keepsakePlacement.transform
      : null;

  const position: Vec3 = [
    transform?.x ?? defaultPosition[0],
    defaultPosition[1],
    transform?.z ?? defaultPosition[2],
  ];

  const isEquippedVisitor =
    discovery.kind === "resident" &&
    discovery.key.startsWith(
      "equipped-visitor:"
    );

  const isBuilderSelected =
    builderEditing &&
    discovery.kind === "keepsake" &&
    keepsakes.selectedKeepsakeKey === discovery.key;

  const marker =
    useRef<THREE.Group>(
      null
    );

  const residentRoam =
    useMemo(
      () => ({
        phase:
          (
            index *
              2.17 +
            discovery.key.length *
              0.37
          ) %
          11.5,
        cycle:
          10.5 +
          (index % 4) *
            1.35,
        pause:
          2.1 +
          (index % 3) *
            0.35,
        radiusX:
          0.5 +
          (index % 3) *
            0.13,
        radiusZ:
          0.38 +
          (index % 4) *
            0.09,
      }),
      [
        discovery.key,
        index,
      ]
    );

  useFrame(
    ({ clock }, delta) => {
      if (!marker.current) {
        return;
      }

      if (
        discovery.kind ===
        "resident"
      ) {
        const cycleTime =
          (
            clock.elapsedTime +
            residentRoam.phase
          ) %
          residentRoam.cycle;

        let targetX =
          position[0];
        let targetZ =
          position[2];

        if (
          isEquippedVisitor &&
          !selected
        ) {
          const rawRoute =
            (
              clock.elapsedTime +
              residentRoam.phase
            ) /
            6.8;

          const routeIndex =
            Math.floor(
              rawRoute
            ) %
            EQUIPPED_VISITOR_ROUTE.length;

          const nextRouteIndex =
            (
              routeIndex +
              1
            ) %
            EQUIPPED_VISITOR_ROUTE.length;

          const localRoute =
            rawRoute -
            Math.floor(
              rawRoute
            );

          const routeMove =
            THREE.MathUtils.smoothstep(
              localRoute,
              0.18,
              0.82
            );

          const from =
            EQUIPPED_VISITOR_ROUTE[
              routeIndex
            ];

          const to =
            EQUIPPED_VISITOR_ROUTE[
              nextRouteIndex
            ];

          targetX =
            THREE.MathUtils.lerp(
              from[0],
              to[0],
              routeMove
            );

          targetZ =
            THREE.MathUtils.lerp(
              from[2],
              to[2],
              routeMove
            );
        } else if (
          !selected &&
          cycleTime >
            residentRoam.pause
        ) {
          const moveProgress =
            (
              cycleTime -
              residentRoam.pause
            ) /
            (
              residentRoam.cycle -
              residentRoam.pause
            );

          const angle =
            moveProgress *
            Math.PI *
            2;

          targetX +=
            (
              Math.cos(
                angle
              ) -
              1
            ) *
            residentRoam.radiusX;

          targetZ +=
            Math.sin(
              angle
            ) *
            residentRoam.radiusZ;
        }

        const previousX =
          marker.current.position.x;
        const previousZ =
          marker.current.position.z;

        const blend =
          1 -
          Math.exp(
            -delta *
              2.6
          );

        marker.current.position.x =
          THREE.MathUtils.lerp(
            previousX,
            targetX,
            blend
          );

        marker.current.position.z =
          THREE.MathUtils.lerp(
            previousZ,
            targetZ,
            blend
          );

        marker.current.position.y =
          position[1] +
          (
            hasCustomVisual
              ? 0
              : Math.sin(
                  clock.elapsedTime *
                    1.9 +
                    index
                ) *
                0.06
          );

        const dx =
          marker.current.position.x -
          previousX;
        const dz =
          marker.current.position.z -
          previousZ;

        if (
          Math.abs(dx) +
            Math.abs(dz) >
          0.0005
        ) {
          marker.current.rotation.y =
            Math.atan2(
              dx,
              dz
            );
        }

        return;
      }

      if (hasCustomVisual) {
        marker.current.position.x =
          position[0];
        marker.current.position.y =
          position[1];
        marker.current.position.z =
          position[2];

        return;
      }

      marker.current.position.y =
        position[1] +
        Math.sin(
          clock.elapsedTime *
            1.9 +
            index
        ) *
          0.08;

      if (!builderEditing) {
        marker.current.rotation.y +=
          0.012;
      }
    }
  );

  return (
    <group
      ref={marker}
      position={position}
      rotation={[
        0,
        transform?.rotationY ?? 0,
        0,
      ]}
      scale={
        discovery.kind === "keepsake"
          ? transform?.scale ?? 1
          : 1
      }
      onPointerDown={(event) => {
        if (
          builderEditing &&
          discovery.kind === "keepsake" &&
          isBuilderSelected
        ) {
          event.stopPropagation();
          keepsakes.armKeepsakeDrag(discovery.key);
        }
      }}
      onClick={(event) => {
        event.stopPropagation();

        if (
          builderEditing &&
          discovery.kind === "keepsake"
        ) {
          selectDecorationPlacement(null);
          keepsakes.selectKeepsake(discovery.key);
          onSelect(
            discovery.key,
            position
          );
          return;
        }

        const livePosition:
          Vec3 =
          discovery.kind ===
            "resident" &&
          marker.current
            ? [
                marker.current
                  .position.x,
                marker.current
                  .position.y,
                marker.current
                  .position.z,
              ]
            : position;

        onSelect(
          discovery.key,
          livePosition
        );
      }}
    >
      {builderEditing &&
      discovery.kind ===
        "keepsake" ? (
        <ScreenSpaceTapTarget
          pixels={58}
          y={0.66}
          minWorld={0.9}
          maxWorld={4.2}
        />
      ) : null}

      {!builderEditing ? (
        <ScreenSpaceTapTarget
          pixels={48}
          y={
            discovery.kind === "resident"
              ? 0.78
              : 0.62
          }
          minWorld={0.78}
          maxWorld={3.2}
        />
      ) : null}

      {(isBuilderSelected || selected) ? (
        <group
          scale={
            discovery.kind ===
            "resident"
              ? 0.64
              : 1
          }
        >
          <SelectionRing
            color={
              discovery.accent
            }
          />
        </group>
      ) : null}

      {discovery.kind ===
      "resident" ? (
        <group
          scale={
            residentScale
          }
        >
          <FriendshipResidentVisual
            visualKey={
              visualKey
            }
            accent={
              discovery.accent
            }
          />
        </group>
      ) : (
        <FriendshipKeepsakeVisual
          visualKey={visualKey}
          accent={
            discovery.accent
          }
        />
      )}

      <mesh
        scale={
          discovery.kind ===
            "resident" &&
          hasCustomVisual
            ? 0.86
            : hasCustomVisual
            ? 1.35
            : 1.8
        }
      >
        <sphereGeometry
          args={[
            0.28,
            12,
            10,
          ]}
        />
        <meshBasicMaterial
          color={
            discovery.accent
          }
          transparent
          opacity={
            builderEditing &&
            discovery.kind === "keepsake"
              ? 0.12
              : hasCustomVisual
              ? 0.045
              : 0.08
          }
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function BuilderSkyExtras({
  cloudOpacity,
  starsOpacity,
}: {
  cloudOpacity: number;
  starsOpacity: number;
}) {
  const starPositions = useMemo(() => {
    const values: number[] = [];

    for (let index = 0; index < 112; index += 1) {
      const angle =
        ((index * 137.5) % 360) *
        (Math.PI / 180);
      const ring =
        index < 34
          ? 15 + ((index * 11) % 8)
          : 24 + ((index * 17) % 16);

      values.push(
        Math.cos(angle) * ring,
        6.5 + ((index * 23) % 115) / 10,
        Math.sin(angle) * ring - (index % 3 === 0 ? 3 : 12)
      );
    }

    return new Float32Array(values);
  }, []);

  return (
    <>
      {[
        {
          startX: -18,
          y: 7.8,
          z: -18,
          speed: 0.1,
          scale: 1.8,
          opacity: 0.46,
        },
        {
          startX: -10,
          y: 10.2,
          z: -24,
          speed: 0.08,
          scale: 2.1,
          opacity: 0.36,
        },
        {
          startX: 2,
          y: 8.7,
          z: -20,
          speed: 0.11,
          scale: 1.65,
          opacity: 0.44,
        },
        {
          startX: 14,
          y: 9.6,
          z: -26,
          speed: 0.07,
          scale: 2.25,
          opacity: 0.34,
        },
        {
          startX: -14,
          y: 4.1,
          z: 7,
          speed: 0.16,
          scale: 1.1,
          opacity: 0.38,
        },
        {
          startX: -3,
          y: 3.6,
          z: 9,
          speed: 0.14,
          scale: 0.95,
          opacity: 0.34,
        },
        {
          startX: 9,
          y: 4.4,
          z: 8,
          speed: 0.13,
          scale: 1.05,
          opacity: 0.36,
        },
        {
          startX: 17,
          y: 5.1,
          z: 5,
          speed: 0.12,
          scale: 1.2,
          opacity: 0.3,
        },
      ].map((cloud, index) => (
        <Cloud
          key={`extra-cloud-${index}`}
          startX={cloud.startX}
          y={cloud.y}
          z={cloud.z}
          speed={cloud.speed}
          scale={cloud.scale}
          opacity={
            cloudOpacity *
            cloud.opacity
          }
        />
      ))}

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              starPositions,
              3,
            ]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#f8fafc"
          size={0.11}
          transparent
          opacity={starsOpacity * 0.82}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  );
}

function LearningEnergyBurst({
  triggerToken,
}: {
  triggerToken: number;
}) {
  const root =
    useRef<THREE.Group>(
      null
    );
  const points =
    useRef<THREE.Points>(
      null
    );
  const ringA =
    useRef<THREE.Mesh>(
      null
    );
  const ringB =
    useRef<THREE.Mesh>(
      null
    );
  const light =
    useRef<THREE.PointLight>(
      null
    );
  const startedAt =
    useRef<number | null>(
      null
    );

  const positions =
    useMemo(() => {
      const values: number[] =
        [];

      for (
        let index = 0;
        index < 54;
        index += 1
      ) {
        const angle =
          (
            index *
            137.5
          ) *
          (
            Math.PI /
            180
          );

        const radius =
          0.7 +
          (
            (index * 31) %
            25
          ) /
            10;

        values.push(
          Math.cos(angle) *
            radius,
          0.2 +
            (
              (index * 17) %
              25
            ) /
              10,
          Math.sin(angle) *
            radius
        );
      }

      return new Float32Array(
        values
      );
    }, []);

  useEffect(() => {
    if (!triggerToken) {
      return;
    }

    startedAt.current =
      Date.now() /
      1000;

    if (root.current) {
      root.current.visible =
        true;
      root.current.position.y =
        0;
      root.current.rotation.y =
        0;
    }
  }, [triggerToken]);

  useFrame((_, delta) => {
    if (
      !root.current ||
      startedAt.current ==
        null
    ) {
      return;
    }

    const elapsed =
      Date.now() /
        1000 -
      startedAt.current;

    const duration = 4.4;

    if (
      elapsed >=
      duration
    ) {
      root.current.visible =
        false;
      startedAt.current =
        null;
      return;
    }

    const progress =
      Math.max(
        0,
        Math.min(
          1,
          elapsed /
            duration
        )
      );

    const fade =
      1 -
      progress;

    root.current.rotation.y +=
      delta *
      (
        0.45 +
        fade *
          0.7
      );

    if (points.current) {
      points.current.position.y =
        progress *
        1.8;

      const scale =
        0.72 +
        progress *
          0.7;

      points.current.scale.setScalar(
        scale
      );

      (
        points.current
          .material as THREE.PointsMaterial
      ).opacity =
        Math.min(
          1,
          fade *
            1.35
        );
    }

    if (ringA.current) {
      const scale =
        0.45 +
        progress *
          4.1;

      ringA.current.scale.set(
        scale,
        scale,
        scale
      );

      (
        ringA.current
          .material as THREE.MeshBasicMaterial
      ).opacity =
        fade *
        0.55;
    }

    if (ringB.current) {
      const delayed =
        Math.max(
          0,
          progress -
            0.16
        ) /
        0.84;

      const scale =
        0.35 +
        delayed *
          3.3;

      ringB.current.scale.set(
        scale,
        scale,
        scale
      );

      (
        ringB.current
          .material as THREE.MeshBasicMaterial
      ).opacity =
        Math.max(
          0,
          1 -
            delayed
        ) *
        0.38;
    }

    if (light.current) {
      light.current.intensity =
        fade *
        2.1;
    }
  });

  return (
    <group
      ref={root}
      visible={false}
      position={[0, 0, 0]}
    >
      <points
        ref={points}
        position={[0, 0.6, 0]}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              positions,
              3,
            ]}
          />
        </bufferGeometry>

        <pointsMaterial
          color="#a5f3fc"
          size={0.13}
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <mesh
        ref={ringA}
        position={[0, 0.12, 0]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <ringGeometry
          args={[
            0.76,
            0.9,
            48,
          ]}
        />
        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh
        ref={ringB}
        position={[0, 0.18, 0]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <ringGeometry
          args={[
            1.05,
            1.14,
            48,
          ]}
        />
        <meshBasicMaterial
          color="#c4b5fd"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <pointLight
        ref={light}
        position={[0, 2.2, 0]}
        color="#67e8f9"
        intensity={0}
        distance={12}
      />
    </group>
  );
}

function StudySpirit({
  route,
  index,
}: {
  route: Vec3[];
  index: number;
}) {
  const root = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (!root.current || route.length < 2) {
      return;
    }

    const time =
      clock.elapsedTime +
      index * 2.35;

    const segmentDuration =
      5.4 +
      (index % 3) * 0.8;

    const raw =
      time / segmentDuration;

    const segment =
      Math.floor(raw) %
      route.length;

    const nextSegment =
      (segment + 1) %
      route.length;

    const local =
      raw - Math.floor(raw);

    const moving =
      THREE.MathUtils.smoothstep(
        local,
        0.16,
        0.84
      );

    const from = route[segment];
    const to = route[nextSegment];

    const x =
      THREE.MathUtils.lerp(
        from[0],
        to[0],
        moving
      );

    const z =
      THREE.MathUtils.lerp(
        from[2],
        to[2],
        moving
      );

    const groundY =
      THREE.MathUtils.lerp(
        from[1],
        to[1],
        moving
      );

    root.current.position.set(
      x,
      groundY +
        0.44 +
        Math.sin(time * 2.2) *
          0.07,
      z
    );

    root.current.rotation.y =
      Math.atan2(
        to[0] - from[0],
        to[2] - from[2]
      );

    if (tail.current) {
      tail.current.rotation.z +=
        delta *
        (index % 2 ? -1.8 : 1.8);
    }
  });

  const bodyColor =
    [
      "#67e8f9",
      "#c4b5fd",
      "#fde68a",
      "#86efac",
    ][index % 4];

  return (
    <group
      ref={root}
      scale={
        0.72 +
        (index % 2) * 0.08
      }
    >
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry
          args={[0.18, 14, 12]}
        />
        <meshStandardMaterial
          color={bodyColor}
          emissive={bodyColor}
          emissiveIntensity={0.62}
          roughness={0.42}
        />
      </mesh>

      <mesh position={[0, 0.41, 0]}>
        <sphereGeometry
          args={[0.12, 14, 12]}
        />
        <meshStandardMaterial
          color="#f8fafc"
          emissive={bodyColor}
          emissiveIntensity={0.34}
          roughness={0.5}
        />
      </mesh>

      <mesh position={[-0.045, 0.43, 0.105]}>
        <sphereGeometry
          args={[0.015, 8, 8]}
        />
        <meshBasicMaterial color="#172033" />
      </mesh>

      <mesh position={[0.045, 0.43, 0.105]}>
        <sphereGeometry
          args={[0.015, 8, 8]}
        />
        <meshBasicMaterial color="#172033" />
      </mesh>

      <group
        ref={tail}
        position={[0, 0.08, -0.18]}
      >
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry
            args={[
              0.12,
              0.025,
              8,
              18,
              Math.PI * 1.45,
            ]}
          />
          <meshBasicMaterial
            color={bodyColor}
            transparent
            opacity={0.78}
          />
        </mesh>
      </group>

      <pointLight
        position={[0, 0.28, 0]}
        color={bodyColor}
        intensity={0.28}
        distance={2.4}
      />
    </group>
  );
}

function AmbientFireflies({
  level,
}: {
  level: number;
}) {
  const root = useRef<THREE.Group>(null);

  const positions =
    useMemo(() => {
      const count =
        Math.min(
          42,
          16 + level * 2
        );

      const values: number[] = [];

      for (
        let index = 0;
        index < count;
        index += 1
      ) {
        const angle =
          index *
          137.5 *
          (Math.PI / 180);

        const radius =
          2.3 +
          ((index * 19) % 43) /
            10;

        values.push(
          Math.cos(angle) * radius,
          0.7 +
            ((index * 13) % 20) /
              10,
          Math.sin(angle) * radius
        );
      }

      return new Float32Array(
        values
      );
    }, [level]);

  useFrame(({ clock }, delta) => {
    if (!root.current) {
      return;
    }

    root.current.rotation.y +=
      delta * 0.035;

    root.current.position.y =
      Math.sin(
        clock.elapsedTime * 0.55
      ) * 0.06;
  });

  return (
    <group ref={root}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#fde68a"
          size={0.08}
          transparent
          opacity={0.66}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}

function IslandAmbientLife({
  level,
}: {
  level: number;
}) {
  const unlocked =
    useMemo(
      () =>
        ISLAND_MILESTONES
          .filter(
            (milestone) =>
              milestone.level <= level
          )
          .map(
            (milestone) =>
              LANDMARK_POSITIONS[
                milestone.id
              ]
          )
          .filter(Boolean) as Vec3[],
      [level]
    );

  const routePoints =
    unlocked.length >= 2
      ? unlocked
      : [
          LANDMARK_POSITIONS.study_grove,
          NOVA_PEDESTAL_WORLD,
        ];

  const spiritCount =
    Math.max(
      2,
      Math.min(
        5,
        2 +
          Math.floor(level / 4)
      )
    );

  const routes =
    useMemo(
      () =>
        Array.from(
          { length: spiritCount },
          (_, index) => {
            const length =
              routePoints.length;

            return [
              routePoints[
                index % length
              ],
              routePoints[
                (
                  index +
                  1 +
                  (index % 2)
                ) %
                  length
              ],
              routePoints[
                (
                  index +
                  2 +
                  (index % 3)
                ) %
                  length
              ],
            ];
          }
        ),
      [routePoints, spiritCount]
    );

  return (
    <>
      <AmbientFireflies
        level={level}
      />

      {routes.map(
        (route, index) => (
          <StudySpirit
            key={`study-spirit-${index}`}
            route={route}
            index={index}
          />
        )
      )}
    </>
  );
}

function DailyQuestAwakenedAura({
  active,
  targetRef,
}: {
  active: boolean;
  targetRef: {
    current:
      | THREE.Group
      | null;
  };
}) {
  type GoldMaterialRecord = {
    material:
      THREE.MeshStandardMaterial;
    color: THREE.Color;
    emissive: THREE.Color;
    emissiveIntensity: number;
    metalness: number;
    roughness: number;
  };

  const originals =
    useRef<
      GoldMaterialRecord[]
    >([]);

  const goldAppliedRef =
    useRef(false);

  const captureMaterials =
    useCallback(() => {
      const root =
        targetRef.current;

      if (!root) {
        return 0;
      }

      if (
        originals.current.length >
        0
      ) {
        return originals.current.length;
      }

      const seen =
        new Set<
          THREE.Material
        >();

      root.traverse(
        (object) => {
          const mesh =
            object as THREE.Mesh;

          const rawMaterial =
            mesh.material;

          if (!rawMaterial) {
            return;
          }

          const materials =
            Array.isArray(
              rawMaterial
            )
              ? rawMaterial
              : [
                  rawMaterial,
                ];

          materials.forEach(
            (candidate) => {
              if (
                !candidate ||
                seen.has(
                  candidate
                )
              ) {
                return;
              }

              /*
               * Do not use instanceof here.
               * Expo/R3F can hand us materials created through a
               * different Three module boundary, making instanceof
               * fail even though the material is a real
               * MeshStandardMaterial.
               */
              const standard =
                candidate as
                  THREE.MeshStandardMaterial;

              if (
                !(
                  standard as any
                ).isMeshStandardMaterial ||
                !standard.color ||
                !standard.emissive
              ) {
                return;
              }

              seen.add(
                candidate
              );

              originals.current.push(
                {
                  material:
                    standard,
                  color:
                    standard.color.clone(),
                  emissive:
                    standard.emissive.clone(),
                  emissiveIntensity:
                    standard.emissiveIntensity,
                  metalness:
                    standard.metalness,
                  roughness:
                    standard.roughness,
                }
              );
            }
          );
        }
      );

      return originals.current.length;
    }, [
      targetRef,
    ]);

  const applyGold =
    useCallback(() => {
      const count =
        captureMaterials();

      if (count <= 0) {
        return false;
      }

      originals.current.forEach(
        (
          {
            material,
            metalness,
            roughness,
          },
          index
        ) => {
          const warm =
            index % 4;

          material.color.set(
            warm === 0
              ? "#f5d66f"
              : warm === 1
              ? "#ddaF35"
              : warm === 2
              ? "#bd851b"
              : "#edc34d"
          );

          material.emissive.set(
            "#754700"
          );

          material.emissiveIntensity =
            0.16;

          material.metalness =
            Math.max(
              metalness,
              0.62
            );

          material.roughness =
            Math.min(
              roughness,
              0.28
            );

          material.needsUpdate =
            true;
        }
      );

      const firstApplication =
        !goldAppliedRef.current;

      goldAppliedRef.current =
        true;

      if (
        __DEV__ &&
        firstApplication
      ) {
        console.log(
          "[DailyQuestStation] gold materials applied:",
          count
        );
      }

      return true;
    }, [
      captureMaterials,
    ]);

  const restoreOriginals =
    useCallback(() => {
      originals.current.forEach(
        ({
          material,
          color,
          emissive,
          emissiveIntensity,
          metalness,
          roughness,
        }) => {
          material.color.copy(
            color
          );

          material.emissive.copy(
            emissive
          );

          material.emissiveIntensity =
            emissiveIntensity;

          material.metalness =
            metalness;

          material.roughness =
            roughness;

          material.needsUpdate =
            true;
        }
      );

      goldAppliedRef.current =
        false;
    }, []);

  useEffect(() => {
    if (!active) {
      restoreOriginals();
      return;
    }

    /*
     * Try immediately, then useFrame below as a guaranteed
     * fallback if the R3F children are not attached yet.
     */
    void applyGold();

    return () => {
      restoreOriginals();
    };
  }, [
    active,
    applyGold,
    restoreOriginals,
  ]);

  /*
   * Some station materials also have declarative color/emissive props
   * driven by rewardReady / bonusReady. Those props can update after the
   * bonus is claimed while allClaimed remains true. Re-apply the real
   * gold materials after every pavilion rerender so the completed-day
   * state stays gold until the daily reset.
   */
  useEffect(() => {
    if (active) {
      void applyGold();
    }
  });

  useFrame(
    ({ clock }) => {
      if (!active) {
        return;
      }

      /*
       * If the effect ran before the station's child meshes
       * existed, capture/apply on the first render frame.
       */
      if (
        !goldAppliedRef.current
      ) {
        if (!applyGold()) {
          return;
        }
      }

      const shimmer =
        0.145 +
        (
          Math.sin(
            clock.elapsedTime *
              1.2
          ) +
          1
        ) *
          0.022;

      originals.current.forEach(
        ({
          material,
        }) => {
          material.emissiveIntensity =
            shimmer;
        }
      );
    }
  );

  return null;
}

function DailyQuestStation({
  ready,
  completedCount,
  totalCount,
  claimableCount,
  allComplete,
  bonusClaimed,
  allClaimed,
  celebrationToken,
  builderEditing,
  onOpen,
}: {
  ready: boolean;
  completedCount: number;
  totalCount: number;
  claimableCount: number;
  allComplete: boolean;
  bonusClaimed: boolean;
  allClaimed: boolean;
  celebrationToken: number;
  builderEditing: boolean;
  onOpen?: () => void;
}) {
  const chest = useRef<THREE.Group>(null);

  const stationVisualRef =
    useRef<THREE.Group>(
      null
    );
  const lid = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);


  const celebrationStartedAt = useRef<number | null>(null);
  const rocketGroup = useRef<THREE.Group>(null);
  const burstGroup = useRef<THREE.Group>(null);
  const celebrationLight = useRef<THREE.PointLight>(null);

  const bonusReady =
    ready &&
    allComplete &&
    !bonusClaimed;

  const rewardReady =
    ready &&
    (
      claimableCount > 0 ||
      bonusReady
    );

  const safeTotal =
    Math.max(1, totalCount);

  const safeComplete =
    Math.max(
      0,
      Math.min(
        safeTotal,
        completedCount
      )
    );

  useEffect(() => {
    if (!celebrationToken) {
      return;
    }

    celebrationStartedAt.current =
      Date.now() / 1000;

    if (rocketGroup.current) {
      rocketGroup.current.visible = true;
      rocketGroup.current.position.y = 0;
    }

    if (burstGroup.current) {
      burstGroup.current.visible = false;
      burstGroup.current.scale.setScalar(0.1);
    }
  }, [celebrationToken]);



  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    const celebrationElapsed =
        celebrationStartedAt.current == null
          ? -1
          : Date.now() / 1000 - celebrationStartedAt.current;

      if (celebrationElapsed >= 0) {
        if (rocketGroup.current) {
          if (celebrationElapsed < 0.9) {
            const launch = celebrationElapsed / 0.9;
            rocketGroup.current.visible = true;
            rocketGroup.current.position.y = launch * 3.0;
            rocketGroup.current.rotation.y = launch * 0.7;
          } else {
            rocketGroup.current.visible = false;
          }
        }

        if (burstGroup.current) {
          const burstTime = celebrationElapsed - 0.75;
          if (burstTime >= 0 && burstTime < 2.35) {
            const grow = Math.min(1, burstTime / 0.45);
            const fade =
              burstTime < 1.35
                ? 1
                : Math.max(0, 1 - (burstTime - 1.35) / 1.0);
            burstGroup.current.visible = true;
            burstGroup.current.position.y =
              3.0 + Math.min(0.7, burstTime * 0.3);
            burstGroup.current.rotation.z = burstTime * 0.85;
            burstGroup.current.rotation.y = burstTime * 1.1;
            burstGroup.current.scale.setScalar(
              (0.18 + grow * 1.55) * Math.max(0.08, fade)
            );
          } else {
            burstGroup.current.visible = false;
          }
        }

        if (celebrationLight.current) {
          celebrationLight.current.intensity =
            celebrationElapsed < 3.1
              ? 1.35 + Math.sin(celebrationElapsed * 10) * 0.45
              : 0;
        }

        if (celebrationElapsed > 3.15) {
          celebrationStartedAt.current = null;
          if (rocketGroup.current) rocketGroup.current.visible = false;
          if (burstGroup.current) burstGroup.current.visible = false;
          if (celebrationLight.current) celebrationLight.current.intensity = 0;
        }
      }


    if (chest.current) {
      chest.current.position.y =
        rewardReady
          ? Math.sin(time * 2.1) * 0.035
          : 0;

      chest.current.rotation.y =
        rewardReady
          ? Math.sin(time * 1.2) * 0.035
          : 0;
    }

    if (lid.current) {
      const target =
        bonusReady
          ? -0.5
          : rewardReady
          ? -0.18
          : 0;

      lid.current.rotation.x =
        THREE.MathUtils.lerp(
          lid.current.rotation.x,
          target,
          0.08
        );
    }

    if (glow.current) {
      glow.current.intensity =
        bonusReady
          ? 1.45 +
            Math.sin(time * 3.4) * 0.45
          : rewardReady
          ? 0.72 +
            Math.sin(time * 2.5) * 0.24
          : 0.08;
    }
  });

  const handlePress =
    (event: any) => {
      event?.stopPropagation?.();

      if (builderEditing) {
        return;
      }

      onOpen?.();
    };

  return (
    <group
      ref={stationVisualRef}
      position={[4.15, 1.03, 0.55]}
      rotation={[0, -0.42, 0]}
      scale={1.42}
      onPointerDown={handlePress}
    >
      <DailyQuestAwakenedAura
        active={allClaimed}
        targetRef={
          stationVisualRef
        }
      />
      {/* Raised quest plaza so this reads as a destination, not clutter. */}
      <mesh
        position={[0.55, -0.04, 0.05]}
        scale={[2.25, 0.12, 1.45]}
      >
        <cylinderGeometry
          args={[1, 1, 1, 10]}
        />
        <meshStandardMaterial
          color="#16324a"
          emissive="#082f49"
          emissiveIntensity={0.18}
          roughness={0.78}
        />
      </mesh>

      <mesh
        position={[0.55, 0.035, 0.05]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        scale={[2.04, 1.24, 1]}
      >
        <ringGeometry
          args={[
            0.82,
            1,
            36,
          ]}
        />
        <meshBasicMaterial
          color={
            bonusReady
              ? "#facc15"
              : rewardReady
              ? "#67e8f9"
              : "#38bdf8"
          }
          transparent
          opacity={
            bonusReady
              ? 0.78
              : rewardReady
              ? 0.58
              : 0.28
          }
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Tall beacon makes the quest area visible from the default camera. */}
      <group
        position={[-0.95, 2.32, 0.02]}
      >
        <MiniStar
          scale={
            bonusReady
              ? 0.88
              : rewardReady
              ? 0.7
              : 0.56
          }
          color={
            bonusReady
              ? "#fef08a"
              : rewardReady
              ? "#67e8f9"
              : "#bae6fd"
          }
        />
        <pointLight
          color={
            bonusReady
              ? "#facc15"
              : "#67e8f9"
          }
          intensity={
            bonusReady
              ? 1.3
              : rewardReady
              ? 0.78
              : 0.18
          }
          distance={4.5}
        />
      </group>

      <group>
        {[-0.72, 0.72].map(
          (x) => (
            <mesh
              key={x}
              position={[x, 0.62, 0]}
              scale={[0.11, 0.8, 0.11]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial
                color="#6b4423"
                roughness={0.86}
              />
            </mesh>
          )
        )}

        <mesh
          position={[0, 1.12, 0]}
          scale={[2.05, 1.28, 0.18]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#7c4a26"
            roughness={0.82}
          />
        </mesh>

        <mesh
          position={[0, 1.84, 0.01]}
          scale={[1.72, 0.16, 0.2]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#facc15"
            emissive="#ca8a04"
            emissiveIntensity={
              rewardReady ? 0.36 : 0.08
            }
            roughness={0.42}
          />
        </mesh>

        {Array.from(
          { length: safeTotal },
          (_, index) => {
            const done =
              index < safeComplete;

            const x =
              (
                index -
                (safeTotal - 1) / 2
              ) * 0.48;

            return (
              <group
                key={`quest-seal-${index}`}
                position={[x, 1.2, 0.1]}
              >
                <mesh
                  rotation={[
                    Math.PI / 2,
                    0,
                    0,
                  ]}
                >
                  <cylinderGeometry
                    args={[
                      0.205,
                      0.205,
                      0.065,
                      20,
                    ]}
                  />
                  <meshStandardMaterial
                    color={
                      done
                        ? "#67e8f9"
                        : "#475569"
                    }
                    emissive={
                      done
                        ? "#0891b2"
                        : "#0f172a"
                    }
                    emissiveIntensity={
                      done ? 0.62 : 0.08
                    }
                    roughness={0.45}
                  />
                </mesh>

                {done ? (
                  <group position={[0, 0.02, 0.04]}>
                    <MiniStar
                      scale={0.4}
                      color="#fef08a"
                    />
                  </group>
                ) : null}
              </group>
            );
          }
        )}

        <mesh
          position={[0, 0.69, 0.11]}
          scale={[1.52, 0.12, 0.09]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.65}
          />
        </mesh>

        {safeComplete > 0 ? (
          <mesh
            position={[
              -0.76 +
                (
                  1.52 *
                  safeComplete /
                  safeTotal
                ) / 2,
              0.78,
              0.15,
            ]}
            scale={[
              1.52 *
                safeComplete /
                safeTotal,
              0.07,
              0.04,
            ]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#0891b2"
              emissiveIntensity={0.48}
            />
          </mesh>
        ) : null}
      </group>

      {/* Three star rockets */}
      <group
        ref={rocketGroup}
        visible={false}
        position={[0.4, 1.8, 0.2]}
      >
        {[-0.68, 0, 0.68].map((x, index) => (
          <group
            key={`quest-rocket-${index}`}
            position={[x, index === 1 ? 0.14 : 0, 0]}
          >
            <MiniStar
              scale={0.32}
              color={index === 1 ? "#fef08a" : "#67e8f9"}
            />
            <mesh
              position={[0, -0.32, 0]}
              scale={[0.045, 0.3, 0.045]}
            >
              <coneGeometry args={[1, 1, 8]} />
              <meshBasicMaterial
                color={index === 1 ? "#fb923c" : "#22d3ee"}
                transparent
                opacity={0.92}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Three compact starbursts */}
      <group
        ref={burstGroup}
        visible={false}
        position={[0.4, 4.8, 0.2]}
      >
        {[-0.72, 0, 0.72].map((x, burstIndex) => (
          <group
            key={`quest-burst-${burstIndex}`}
            position={[x, burstIndex === 1 ? 0.3 : 0, 0]}
          >
            {[
              [0, 0, 0],
              [0.42, 0, 0],
              [-0.42, 0, 0],
              [0, 0.42, 0],
              [0, -0.42, 0],
              [0.3, 0.3, 0.05],
              [-0.3, 0.3, -0.05],
              [0.3, -0.3, -0.05],
              [-0.3, -0.3, 0.05],
            ].map((position, sparkIndex) => (
              <group
                key={`quest-burst-${burstIndex}-${sparkIndex}`}
                position={position as Vec3}
              >
                <MiniStar
                  scale={sparkIndex === 0 ? 0.32 : 0.18}
                  color={
                    burstIndex === 1
                      ? sparkIndex % 2 === 0
                        ? "#fef08a"
                        : "#fb923c"
                      : sparkIndex % 2 === 0
                      ? "#67e8f9"
                      : "#c4b5fd"
                  }
                />
              </group>
            ))}
          </group>
        ))}
      </group>

      <pointLight
        ref={celebrationLight}
        position={[0.4, 4.8, 0.25]}
        color="#fef08a"
        intensity={0}
        distance={8}
      />



      <group
        ref={chest}
        position={[1.62, 0.3, 0.38]}
        scale={0.94}
      >
        <mesh
          position={[0, 0.28, 0]}
          scale={[0.86, 0.5, 0.62]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#7c2d12"
            emissive={
              rewardReady
                ? "#9a3412"
                : "#000000"
            }
            emissiveIntensity={
              rewardReady ? 0.22 : 0
            }
            roughness={0.68}
          />
        </mesh>

        <group
          ref={lid}
          position={[0, 0.57, -0.24]}
        >
          <mesh
            position={[0, 0.13, 0.24]}
            scale={[0.9, 0.28, 0.66]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#92400e"
              emissive={
                bonusReady
                  ? "#f59e0b"
                  : "#000000"
              }
              emissiveIntensity={
                bonusReady ? 0.34 : 0
              }
              roughness={0.58}
            />
          </mesh>
        </group>

        {[-0.31, 0.31].map(
          (x) => (
            <mesh
              key={x}
              position={[x, 0.32, 0.33]}
              scale={[0.09, 0.58, 0.06]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial
                color="#facc15"
                metalness={0.6}
                roughness={0.3}
              />
            </mesh>
          )
        )}

        <mesh
          position={[0, 0.31, 0.34]}
          scale={[0.18, 0.21, 0.07]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={
              bonusReady
                ? "#fef08a"
                : rewardReady
                ? "#67e8f9"
                : "#facc15"
            }
            emissive={
              bonusReady
                ? "#f59e0b"
                : rewardReady
                ? "#0891b2"
                : "#000000"
            }
            emissiveIntensity={
              rewardReady ? 0.72 : 0
            }
            metalness={0.55}
            roughness={0.25}
          />
        </mesh>

        {rewardReady ? (
          <group position={[0, 1.16, 0]}>
            <MiniStar
              scale={
                bonusReady ? 0.68 : 0.48
              }
              color={
                bonusReady
                  ? "#fef08a"
                  : "#67e8f9"
              }
            />
          </group>
        ) : null}

        <pointLight
          ref={glow}
          position={[0, 0.8, 0.15]}
          color={
            bonusReady
              ? "#facc15"
              : "#67e8f9"
          }
          intensity={
            rewardReady
              ? bonusReady
                ? 1.8
                : 0.95
              : 0.22
          }
          distance={
            bonusReady ? 5 : 3.4
          }
        />
      </group>
    </group>
  );
}

function IslandWorld({
  level,
  palette,
  learningPulseToken,
  dailyQuestReady,
  dailyQuestCompletedCount,
  dailyQuestTotalCount,
  dailyQuestClaimableCount,
  dailyQuestAllComplete,
  dailyQuestBonusClaimed,
  dailyQuestAllClaimed,
  dailyQuestCelebrationToken,
  onOpenDailyQuests,
  builderEditing,
  selectedMilestoneId,
  selectedDiscoveryKey,
  selectedDecorationPlacementId,
  discoveries,
  legendaryCompanionIds,
  builderPlacements,
  onBuilderDragStart,
  selectedLegendaryId,
  onSelectMilestone,
  onSelectDiscovery,
  onSelectDecoration,
  onSelectLegendary,
  controlsRef,
  velocityRef,
  onNovaProject,
}: {
  level: number;
  palette: TimePalette;
  learningPulseToken: number;
  dailyQuestReady: boolean;
  dailyQuestCompletedCount: number;
  dailyQuestTotalCount: number;
  dailyQuestClaimableCount: number;
  dailyQuestAllComplete: boolean;
  dailyQuestBonusClaimed: boolean;
  dailyQuestAllClaimed: boolean;
  dailyQuestCelebrationToken: number;
  onOpenDailyQuests?: () => void;
  builderEditing: boolean;
  selectedMilestoneId: string;
  selectedDiscoveryKey: string | null;
  selectedDecorationPlacementId: string | null;
  discoveries: Island3DDiscovery[];
  legendaryCompanionIds: string[];
  builderPlacements?: IslandPlacement[];
  onBuilderDragStart: (
    milestoneId: string
  ) => void;
  selectedLegendaryId: LegendaryIslandId | null;
  onSelectMilestone: (
    milestoneId: string,
    position: Vec3
  ) => void;
  onSelectDiscovery: (
    discoveryKey: string,
    position: Vec3
  ) => void;
  onSelectDecoration: (
    placementId: string
  ) => void;
  onSelectLegendary: (
    legendary: LegendaryIslandInfo
  ) => void;
  controlsRef: React.MutableRefObject<OrbitControlsState>;
  velocityRef: React.MutableRefObject<OrbitVelocityState>;
  onNovaProject: (
    projection: NovaOverlayProjection
  ) => void;
}) {
  const builderEnabled =
    Array.isArray(
      builderPlacements
    );

  const builderPlacementByItemId =
    useMemo(
      () =>
        new Map(
          (
            builderPlacements ??
            []
          ).map(
            (placement) => [
              placement.itemId,
              placement,
            ]
          )
        ),
      [builderPlacements]
    );

  return (
    <>
      <fog
        attach="fog"
        args={[
          palette.skyTop,
          40,
          110,
        ]}
      />

      <ambientLight
        intensity={
          palette.ambient
        }
      />

      <hemisphereLight
        args={[
          palette.horizon,
          "#332821",
          palette.fillLight,
        ]}
      />

      <directionalLight
        position={
          palette.celestialPosition
        }
        intensity={
          palette.keyLight
        }
        color={
          palette.celestialColor
        }
      />

      <pointLight
        position={[
          0,
          5,
          2,
        ]}
        color="#7dd3fc"
        intensity={0.46}
        distance={18}
      />

      <StarField
        opacity={
          palette.starsOpacity
        }
      />

      <BuilderSkyExtras
        cloudOpacity={
          palette.cloudOpacity
        }
        starsOpacity={
          palette.starsOpacity
        }
      />

      <CelestialBody
        palette={palette}
      />

      {[
        {
          startX: -14,
          y: 6.2,
          z: -5,
          speed: 0.28,
          scale: 1.05,
          opacity: 1,
        },
        {
          startX: -8,
          y: 8.1,
          z: -11,
          speed: 0.17,
          scale: 1.55,
          opacity: 0.78,
        },
        {
          startX: -2,
          y: 5.4,
          z: -3,
          speed: 0.23,
          scale: 0.84,
          opacity: 0.9,
        },
        {
          startX: 4,
          y: 7.2,
          z: -7,
          speed: 0.2,
          scale: 1.22,
          opacity: 0.88,
        },
        {
          startX: 10,
          y: 5.9,
          z: -2,
          speed: 0.26,
          scale: 0.94,
          opacity: 0.82,
        },
        {
          startX: 14,
          y: 8.8,
          z: -13,
          speed: 0.14,
          scale: 1.72,
          opacity: 0.68,
        },
        {
          startX: -5,
          y: 9.5,
          z: 1,
          speed: 0.12,
          scale: 1.08,
          opacity: 0.62,
        },
        {
          startX: 7,
          y: 6.6,
          z: 2,
          speed: 0.19,
          scale: 0.78,
          opacity: 0.7,
        },
      ].map(
        (cloud, index) => (
          <Cloud
            key={index}
            startX={
              cloud.startX
            }
            y={cloud.y}
            z={cloud.z}
            speed={
              cloud.speed
            }
            scale={
              cloud.scale
            }
            opacity={
              palette.cloudOpacity *
              cloud.opacity
            }
          />
        )
      )}

      <group
        rotation={[
          0,
          -0.08,
          0,
        ]}
      >
        <IslandBase
        onDeselect={() =>
          onSelectMilestone(
            "__nova_builder_clear_selection__",
            DEFAULT_TARGET
          )
        }
      />



        <IslandExpansions
          level={level}
        />

        <IslandDecorationLayer
          inspectedPlacementId={
            selectedDecorationPlacementId
          }
          onInspectDecoration={
            onSelectDecoration
          }
          onSelectDecoration={() =>
            onSelectMilestone(
              "__nova_builder_clear_selection__",
              DEFAULT_TARGET
            )
          }
        />

        <MagicWisps
          level={level}
        />

        <IslandAmbientLife
          level={level}
        />

        <DailyQuestStation
          ready={dailyQuestReady}
          completedCount={
            dailyQuestCompletedCount
          }
          totalCount={
            dailyQuestTotalCount
          }
          claimableCount={
            dailyQuestClaimableCount
          }
          allComplete={
            dailyQuestAllComplete
          }
          bonusClaimed={
            dailyQuestBonusClaimed
          }
          allClaimed={
            dailyQuestAllClaimed
          }
          celebrationToken={
            dailyQuestCelebrationToken
          }
          builderEditing={
            builderEditing
          }
          onOpen={
            onOpenDailyQuests
          }
        />

        <LearningEnergyBurst
          triggerToken={
            learningPulseToken
          }
        />

        <LearningEnergyBurst
          triggerToken={
            learningPulseToken
          }
        />

        <LegendarySatelliteIslands
          ownedCompanionIds={
            legendaryCompanionIds
          }
          selectedLegendaryId={
            selectedLegendaryId
          }
          onSelectLegendary={
            onSelectLegendary
          }
        />

        {level >= 1 ? (
          <group
            position={
              NOVA_PEDESTAL_WORLD
            }
          >
            <NovaPedestal />
            <NovaOverlayAnchor
              onProject={
                onNovaProject
              }
            />
          </group>
        ) : null}

        <React.Suspense fallback={null}>
          <StoryResidents
            level={level}
          />
        </React.Suspense>

        {ISLAND_MILESTONES.map(
          (milestone) => (
            <LandmarkObject
              key={
                milestone.id
              }
              milestone={
                milestone
              }
              level={level}
              placement={
                builderPlacementByItemId.get(
                  milestone.id
                ) ?? null
              }
              builderEnabled={
                builderEnabled
              }
              onBuilderDragStart={
                onBuilderDragStart
              }
              selected={
                selectedMilestoneId ===
                  milestone.id &&
                !selectedDiscoveryKey &&
                !selectedLegendaryId
              }
              onSelect={
                onSelectMilestone
              }
            />
          )
        )}

        {discoveries.map(
          (discovery, index) => (
            <DiscoveryMarker
              key={
                discovery.key
              }
              discovery={
                discovery
              }
              index={index}
              selected={
                selectedDiscoveryKey ===
                  discovery.key &&
                !selectedLegendaryId
              }
              onSelect={
                onSelectDiscovery
              }
            />
          )
        )}
      </group>

      <CameraRig
        controlsRef={
          controlsRef
        }
        velocityRef={
          velocityRef
        }
      />
    </>
  );
}

// NOVA_ISLAND_EXPANSION_PACK_1
export default function NovaIsland3DScene({
  level,
  height = 450,
  learningPulseToken = 0,
  dailyQuestReady = false,
  dailyQuestCompletedCount = 0,
  dailyQuestTotalCount = 3,
  dailyQuestClaimableCount = 0,
  dailyQuestAllComplete = false,
  dailyQuestBonusClaimed = false,
  dailyQuestAllClaimed = false,
  dailyQuestCelebrationToken = 0,
  onOpenDailyQuests,
  selectedMilestoneId,
  selectedDiscoveryKey,
  selectedDecorationPlacementId = null,
  discoveries,
  legendaryCompanionIds = [],
  builderPlacements,
  onSelectMilestone,
  onSelectDiscovery,
  onSelectDecoration,
  onInteractionChange,
}: Props) {
  const {
    isEditing: builderEditing,
    movePlacement,
  } = useIslandBuilder();

  const {
    placements: decorationPlacements,
    movePlacement: moveDecorationPlacement,
    selectPlacement: selectDecorationPlacement,
    getArmedDecorationDrag,
    clearDecorationDrag,
  } = useIslandDecorations();

  const {
    moveKeepsake,
    selectKeepsake,
    getArmedKeepsakeDrag,
    clearKeepsakeDrag,
  } = useIslandKeepsakes();

  const [now, setNow] =
    useState(
      () => new Date()
    );

  const [
    selectedLegendaryId,
    setSelectedLegendaryId,
  ] = useState<LegendaryIslandId | null>(
    null
  );

  const expansionViewDistance =
    level >= 21
      ? 46.5
      : level >= 18
      ? 43.5
      : level >= 15
      ? 40.5
      : level >= 12
      ? 37.5
      : 34.5;

  const fullViewDistance =
    legendaryCompanionIds.length > 0
      ? Math.max(
          expansionViewDistance,
          64
        )
      : expansionViewDistance;

  const controlsRef =
    useRef<OrbitControlsState>({
      azimuth: 0.58,
      polar: 0.98,
      distance: fullViewDistance,
      desiredAzimuth: 0.58,
      desiredPolar: 0.98,
      desiredTarget: [
        ...DEFAULT_TARGET,
      ],
      desiredDistance: fullViewDistance,
    });

  const velocityRef =
    useRef<OrbitVelocityState>({
      azimuth: 0,
      polar: 0,
    });

  const gestureStartRef =
    useRef({
      azimuth: 0.58,
      polar: 0.98,
      distance: fullViewDistance,
      pinchDistance: 0,
      targetX: DEFAULT_TARGET[0],
      targetY: DEFAULT_TARGET[1],
      targetZ: DEFAULT_TARGET[2],
      touchX: 0,
      touchY: 0,
    });

  const twoFingerGestureRef =
    useRef<{
      centerX: number;
      centerY: number;
      pinchDistance: number;
      azimuth: number;
      polar: number;
      distance: number;
    } | null>(null);

  const builderDragRef =
    useRef<{
      placementId: string;
      itemId: string;
      x: number;
      z: number;
      scale: number;
    } | null>(null);

  const pendingBuilderMoveRef =
    useRef<{
      placementId: string;
      x: number;
      z: number;
    } | null>(null);

  const builderMoveFrameRef =
    useRef<
      ReturnType<
        typeof requestAnimationFrame
      > | null
    >(null);

  const interactionActiveRef =
    useRef(false);

  const novaOverlayRef =
    useRef<View | null>(
      null
    );

  const updateNovaOverlay =
    useCallback(
      (
        projection: NovaOverlayProjection
      ) => {
        const width =
          NOVA_SPRITE_BASE_WIDTH *
          projection.scale;

        const height =
          NOVA_SPRITE_BASE_HEIGHT *
          projection.scale;

        novaOverlayRef.current?.setNativeProps(
          {
            style: {
              left:
                projection.x -
                width / 2,
              top:
                projection.y -
                height +
                4,
              width,
              height,
              opacity:
                projection.visible
                  ? 1
                  : 0,
            },
          }
        );
      },
      []
    );

  const setInteractionActive =
    useCallback(
      (active: boolean) => {
        if (
          interactionActiveRef.current ===
          active
        ) {
          return;
        }

        interactionActiveRef.current =
          active;

        onInteractionChange?.(
          active
        );
      },
      [onInteractionChange]
    );

  useEffect(() => {
    const timer =
      setInterval(() => {
        setNow(new Date());
      }, 60_000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const palette =
    useMemo(
      () =>
        paletteForDate(now),
      [now]
    );

  useEffect(() => {
    if (selectedLegendaryId) {
      return;
    }

    controlsRef.current.desiredDistance =
      fullViewDistance;
  }, [
    fullViewDistance,
    selectedLegendaryId,
  ]);

  useEffect(() => {
    if (selectedLegendaryId) {
      return;
    }

    controlsRef.current.desiredTarget =
      [...DEFAULT_TARGET];

    controlsRef.current.desiredDistance =
      builderEditing
        ? Math.max(
            fullViewDistance,
            54
          )
        : fullViewDistance;

    if (builderEditing) {
      controlsRef.current.desiredAzimuth =
        0.58;
      controlsRef.current.desiredPolar =
        0.82;
    }

    velocityRef.current = {
      azimuth: 0,
      polar: 0,
    };
  }, [
    builderEditing,
    fullViewDistance,
    selectedLegendaryId,
  ]);

  const focusPosition =
    useCallback(
      (
        position: Vec3,
        distance = 7.1
      ) => {
        controlsRef.current.desiredTarget =
          [
            position[0],
            Math.max(
              0.6,
              position[1] + 0.48
            ),
            position[2],
          ];

        controlsRef.current.desiredDistance =
          distance;

        velocityRef.current = {
          azimuth: 0,
          polar: 0,
        };
      },
      []
    );

  const resetView =
    useCallback(() => {
      controlsRef.current.desiredTarget =
        [
          ...DEFAULT_TARGET,
        ];

      controlsRef.current.desiredDistance =
        builderEditing
          ? Math.max(
              fullViewDistance,
              32
            )
          : fullViewDistance;

      controlsRef.current.desiredAzimuth =
        0.58;

      controlsRef.current.desiredPolar =
        0.98;

      velocityRef.current = {
        azimuth: 0,
        polar: 0,
      };
    }, [builderEditing, fullViewDistance]);

  const selectMilestone =
    useCallback(
      (
        milestoneId: string,
        position: Vec3
      ) => {
        setSelectedLegendaryId(
          null
        );

        selectDecorationPlacement(
          null
        );
        selectKeepsake(
          null
        );
        onSelectDecoration?.(
          null
        );

        onSelectMilestone(
          milestoneId
        );

        /*
         * Clicking the island's blank grass uses this sentinel only to
         * deselect things. It must never focus DEFAULT_TARGET, because that
         * point sits near Lunis and makes the camera appear to snap to him.
         */
        if (
          milestoneId ===
          "__nova_builder_clear_selection__"
        ) {
          return;
        }

        if (!builderEditing) {
          focusPosition(
            position,
            7.3
          );
        }
      },
      [
        builderEditing,
        focusPosition,
        onSelectDecoration,
        onSelectMilestone,
        selectDecorationPlacement,
        selectKeepsake,
      ]
    );

  const selectDiscovery =
    useCallback(
      (
        discoveryKey: string,
        position: Vec3
      ) => {
        setSelectedLegendaryId(
          null
        );

        onSelectDecoration?.(
          null
        );

        onSelectDiscovery(
          discoveryKey
        );

        if (!builderEditing) {
          focusPosition(
            position,
            6.2
          );
        }
      },
      [
        builderEditing,
        focusPosition,
        onSelectDecoration,
        onSelectDiscovery,
      ]
    );

    const selectDecoration =
    useCallback(
      (
        placementId: string
      ) => {
        if (builderEditing) {
          return;
        }

        const placement =
          decorationPlacements.find(
            (item) =>
              item.placementId ===
              placementId
          );

        if (!placement) {
          return;
        }

        setSelectedLegendaryId(
          null
        );

        selectKeepsake(
          null
        );

        onSelectDecoration?.(
          placementId
        );

        focusPosition(
          [
            placement.transform.x,
            0.72,
            placement.transform.z,
          ],
          6.4
        );
      },
      [
        builderEditing,
        decorationPlacements,
        focusPosition,
        onSelectDecoration,
        selectKeepsake,
      ]
    );

const selectLegendary =
    useCallback(
      (
        legendary: LegendaryIslandInfo
      ) => {
        setSelectedLegendaryId(
          legendary.id
        );

        onSelectDecoration?.(
          null
        );

        focusPosition(
          legendary.position,
          5.25
        );
      },
      [
        focusPosition,
        onSelectDecoration,
      ]
    );

  const queueBuilderMove =
    useCallback(
      (
        placementId: string,
        x: number,
        z: number
      ) => {
        pendingBuilderMoveRef.current = {
          placementId,
          x,
          z,
        };

        if (
          builderMoveFrameRef.current !==
          null
        ) {
          return;
        }

        builderMoveFrameRef.current =
          requestAnimationFrame(
            () => {
              builderMoveFrameRef.current =
                null;

              const pending =
                pendingBuilderMoveRef.current;

              pendingBuilderMoveRef.current =
                null;

              if (!pending) {
                return;
              }

              movePlacement(
                pending.placementId,
                {
                  x: pending.x,
                  z: pending.z,
                }
              );
            }
          );
      },
      [movePlacement]
    );

  useEffect(
    () => () => {
      if (
        builderMoveFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          builderMoveFrameRef.current
        );
      }
    },
    []
  );

  const startBuilderDrag =
    useCallback(
      (milestoneId: string) => {
        if (!builderEditing) {
          return;
        }

        const placement =
          (
            builderPlacements ??
            []
          ).find(
            (item) =>
              item.itemId ===
              milestoneId
          );

        if (!placement) {
          return;
        }

        builderDragRef.current = {
          placementId:
            placement.placementId,
          itemId:
            placement.itemId,
          x: placement.transform.x,
          z: placement.transform.z,
          scale:
            placement.transform.scale,
        };

        onSelectMilestone(
          milestoneId
        );
      },
      [
        builderEditing,
        builderPlacements,
        onSelectMilestone,
      ]
    );

  const panResponder =
    useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder:
            () => false,

          onMoveShouldSetPanResponder:
            (
              event,
              gesture
            ) => {
              const touches =
                event.nativeEvent
                  .touches;

              return (
                touches.length >=
                  2 ||
                Math.abs(
                  gesture.dx
                ) > 4 ||
                Math.abs(
                  gesture.dy
                ) > 8
              );
            },

          onMoveShouldSetPanResponderCapture:
            (
              event,
              gesture
            ) => {
              const touches =
                event.nativeEvent
                  .touches;

              return (
                touches.length >=
                  2 ||
                Math.abs(
                  gesture.dx
                ) > 4 ||
                Math.abs(
                  gesture.dy
                ) > 8
              );
            },

          onPanResponderGrant:
            (event) => {
              setInteractionActive(
                true
              );

              gestureStartRef.current =
                {
                  azimuth:
                    controlsRef
                      .current
                      .desiredAzimuth,
                  polar:
                    controlsRef
                      .current
                      .desiredPolar,
                  distance:
                    controlsRef
                      .current
                      .desiredDistance,
                  pinchDistance:
                    distanceBetweenTouches(
                      event
                        .nativeEvent
                        .touches
                    ),
                  targetX:
                    controlsRef
                      .current
                      .desiredTarget[0],
                  targetY:
                    controlsRef
                      .current
                      .desiredTarget[1],
                  targetZ:
                    controlsRef
                      .current
                      .desiredTarget[2],
                  touchX:
                    event.nativeEvent.touches[0]?.pageX ?? 0,
                  touchY:
                    event.nativeEvent.touches[0]?.pageY ?? 0,
                };

              twoFingerGestureRef.current = null;

              velocityRef.current =
                {
                  azimuth: 0,
                  polar: 0,
                };
            },

          onPanResponderMove:
            (event, _gesture) => {
              const touches = event.nativeEvent.touches;

              if (touches.length >= 2) {
                builderDragRef.current = null;
                clearDecorationDrag();
                clearKeepsakeDrag();

                const t0 = touches[0];
                const t1 = touches[1];
                const centerX = (t0.pageX + t1.pageX) / 2;
                const centerY = (t0.pageY + t1.pageY) / 2;
                const pinch = distanceBetweenTouches(touches);

                if (!twoFingerGestureRef.current) {
                  twoFingerGestureRef.current = {
                    centerX,
                    centerY,
                    pinchDistance: Math.max(1, pinch),
                    azimuth: controlsRef.current.desiredAzimuth,
                    polar: controlsRef.current.desiredPolar,
                    distance: controlsRef.current.desiredDistance,
                  };
                  velocityRef.current = { azimuth: 0, polar: 0 };
                  return;
                }

                const s = twoFingerGestureRef.current;
                const dx = centerX - s.centerX;
                const dy = centerY - s.centerY;

                controlsRef.current.desiredAzimuth =
                  s.azimuth - dx * 0.0042;

                controlsRef.current.desiredPolar =
                  clamp(s.polar + dy * 0.0027, 0.38, 1.34);

                if (pinch > 0 && s.pinchDistance > 0) {
                  const ratio = pinch / s.pinchDistance;
                  controlsRef.current.desiredDistance =
                    clamp(s.distance / Math.pow(ratio, 0.82), 6.5, 90);
                }

                velocityRef.current = { azimuth: 0, polar: 0 };
                return;
              }

              const touch = touches[0];
              if (!touch) return;

              if (twoFingerGestureRef.current) {
                twoFingerGestureRef.current = null;
                gestureStartRef.current = {
                  azimuth: controlsRef.current.desiredAzimuth,
                  polar: controlsRef.current.desiredPolar,
                  distance: controlsRef.current.desiredDistance,
                  pinchDistance: 0,
                  targetX: controlsRef.current.desiredTarget[0],
                  targetY: controlsRef.current.desiredTarget[1],
                  targetZ: controlsRef.current.desiredTarget[2],
                  touchX: touch.pageX,
                  touchY: touch.pageY,
                };
                return;
              }

              const dx = touch.pageX - gestureStartRef.current.touchX;
              const dy = touch.pageY - gestureStartRef.current.touchY;
              const azimuth = gestureStartRef.current.azimuth;
              const unitsPerPixel =
                clamp(gestureStartRef.current.distance / 1250, 0.007, 0.02);

              const rightX = Math.cos(azimuth);
              const rightZ = -Math.sin(azimuth);
              const downX = Math.sin(azimuth);
              const downZ = Math.cos(azimuth);

              const deltaX =
                (dx * rightX + dy * downX) * unitsPerPixel;
              const deltaZ =
                (dx * rightZ + dy * downZ) * unitsPerPixel;

              if (builderEditing) {
                const landmarkDrag = builderDragRef.current;
                const decorationDrag = getArmedDecorationDrag();
                const keepsakeDrag = getArmedKeepsakeDrag();

                if (landmarkDrag) {
                  const next = clampIslandBuildPosition(
                    landmarkDrag.x + deltaX,
                    landmarkDrag.z + deltaZ,
                    landmarkDrag.scale,
                    landmarkDrag.itemId
                  );
                  queueBuilderMove(
                    landmarkDrag.placementId,
                    next.x,
                    next.z
                  );
                  velocityRef.current = { azimuth: 0, polar: 0 };
                  return;
                }

                if (decorationDrag) {
                  const next = clampIslandBuildPosition(
                    decorationDrag.transform.x + deltaX,
                    decorationDrag.transform.z + deltaZ,
                    decorationDrag.transform.scale,
                    decorationDrag.itemId
                  );
                  moveDecorationPlacement(
                    decorationDrag.placementId,
                    { x: next.x, z: next.z }
                  );
                  velocityRef.current = { azimuth: 0, polar: 0 };
                  return;
                }

                if (keepsakeDrag) {
                  const next = clampIslandBuildPosition(
                    keepsakeDrag.transform.x + deltaX,
                    keepsakeDrag.transform.z + deltaZ,
                    keepsakeDrag.transform.scale,
                    keepsakeDrag.key
                  );
                  moveKeepsake(
                    keepsakeDrag.key,
                    { x: next.x, z: next.z }
                  );
                  velocityRef.current = { azimuth: 0, polar: 0 };
                  return;
                }
              }

              controlsRef.current.desiredTarget = [
                clamp(
                  gestureStartRef.current.targetX - deltaX,
                  -21,
                  21
                ),
                gestureStartRef.current.targetY,
                clamp(
                  gestureStartRef.current.targetZ - deltaZ,
                  -21,
                  21
                ),
              ];

              velocityRef.current = { azimuth: 0, polar: 0 };
            },

          onPanResponderRelease:
            () => {
              builderDragRef.current = null;
              clearDecorationDrag();
              clearKeepsakeDrag();
              twoFingerGestureRef.current = null;

              velocityRef.current = {
                azimuth: 0,
                polar: 0,
              };

              setInteractionActive(false);
            },

          onPanResponderTerminate:
            () => {
              builderDragRef.current =
                null;

              velocityRef.current =
                {
                  azimuth: 0,
                  polar: 0,
                };

              setInteractionActive(
                false
              );
            },

          /*
           * Once the scene has claimed a rotation/pinch gesture, the parent
           * ScrollView may not steal it midway through.
           */
          onPanResponderTerminationRequest:
            () => false,

          onShouldBlockNativeResponder:
            () => true,
        }),
      [builderEditing, clearDecorationDrag, clearKeepsakeDrag, getArmedDecorationDrag, getArmedKeepsakeDrag, moveDecorationPlacement, moveKeepsake, queueBuilderMove, setInteractionActive]
    );

  const selectedMilestone =
    ISLAND_MILESTONES.find(
      (item) =>
        item.id ===
        selectedMilestoneId
    ) ??
    ISLAND_MILESTONES[0];

  const selectedDiscovery =
    discoveries.find(
      (item) =>
        item.key ===
        selectedDiscoveryKey
    ) ?? null;

  const selectedLegendary =
    getLegendaryIslandInfo(
      selectedLegendaryId
    );

  const selectedDecorationPlacement =
    decorationPlacements.find(
      (placement) =>
        placement.placementId ===
        selectedDecorationPlacementId
    ) ?? null;

  const selectedDecoration =
    selectedDecorationPlacement
      ? ISLAND_DECORATION_CATALOG_BY_ID[
          selectedDecorationPlacement.itemId
        ] ?? null
      : null;

  const unlocked =
    level >=
    selectedMilestone.level;

  const selectedTitle =
    selectedLegendary?.title ??
    selectedDecoration?.title ??
    selectedDiscovery?.title ??
    (unlocked
      ? selectedMilestone.title
      : "Unknown Discovery");

  const selectedLore =
    selectedLegendary
      ? selectedLegendary.description
      : selectedDecoration
      ? selectedDecoration.description
      : selectedDiscovery
      ? selectedDiscovery.kind ===
        "resident"
        ? "A bonded companion now calls this island home."
        : "A friendship keepsake has taken root in this part of the island."
      : unlocked
      ? LANDMARK_LORE[
          selectedMilestone.id
        ] ??
        selectedMilestone.description
      : `A hidden part of Nova Island will reveal itself at Level ${selectedMilestone.level}.`;

  const selectedStatusLabel =
    selectedLegendary
      ? "LEGENDARY"
      : selectedDecoration
      ? selectedDecoration.rarity.toUpperCase()
      : selectedDiscovery
      ? selectedDiscovery.kind ===
        "resident"
        ? "RESIDENT"
        : "KEEPSAKE"
      : unlocked
      ? "AWAKE"
      : `LEVEL ${selectedMilestone.level}`;

  const selectedStatusBackground =
    selectedLegendary
      ? `${selectedLegendary.accent}33`
      : selectedDecoration
      ? `${selectedDecoration.accent}33`
      : selectedDiscovery
      ? selectedDiscovery.kind ===
        "resident"
        ? "rgba(16,185,129,0.18)"
        : "rgba(250,204,21,0.16)"
      : unlocked
      ? "rgba(34,211,238,0.16)"
      : "rgba(100,116,139,0.3)";

  const selectedStatusColor =
    selectedLegendary?.accent ??
    selectedDecoration?.accent ??
    (selectedDiscovery
      ? selectedDiscovery.kind ===
        "resident"
        ? "#6ee7b7"
        : "#fde68a"
      : unlocked
      ? "#67e8f9"
      : "#cbd5e1");

  return (
    <View
      style={[
        styles.container,
        {
          height,
        },
      ]}
      /*
       * Disable the page scroll as soon as a finger touches the 3D viewport.
       * These touch callbacks do not claim the responder, so Canvas taps still
       * reach landmarks normally.
       */
      onTouchStart={() =>
        setInteractionActive(
          true
        )
      }
      onTouchEnd={() => {
        builderDragRef.current =
          null;
        clearDecorationDrag();
                  clearKeepsakeDrag();
        setInteractionActive(
          false
        );
      }}
      onTouchCancel={() => {
        builderDragRef.current =
          null;
        clearDecorationDrag();
                  clearKeepsakeDrag();
        setInteractionActive(
          false
        );
      }}
      {...panResponder.panHandlers}
    >
      <LinearGradient
        colors={[
          palette.skyTop,
          palette.skyBottom,
        ]}
        style={
          StyleSheet.absoluteFill
        }
      />

      <Canvas
        onPointerMissed={() => {
          if (builderEditing) {
            selectMilestone(
              "__nova_builder_clear_selection__",
              DEFAULT_TARGET
            );
          }
        }}
        style={
          StyleSheet.absoluteFill
        }
        dpr={[
          1,
          1.5,
        ]}
        gl={{
          antialias: true,
          alpha: true,
        }}
        camera={{
          fov: 46,
          near: 0.1,
          far: 100,
          position: [
            7,
            8,
            10,
          ],
        }}
      >
        <IslandWorld
          level={level}
          palette={palette}
          learningPulseToken={
            learningPulseToken
          }
          dailyQuestReady={
            dailyQuestReady
          }
          dailyQuestCompletedCount={
            dailyQuestCompletedCount
          }
          dailyQuestTotalCount={
            dailyQuestTotalCount
          }
          dailyQuestClaimableCount={
            dailyQuestClaimableCount
          }
          dailyQuestAllComplete={
            dailyQuestAllComplete
          }
          dailyQuestBonusClaimed={
            dailyQuestBonusClaimed
          }
          dailyQuestAllClaimed={
            dailyQuestAllClaimed
          }
          dailyQuestCelebrationToken={
            dailyQuestCelebrationToken
          }
          onOpenDailyQuests={
            onOpenDailyQuests
          }
          builderEditing={
            builderEditing
          }
          selectedMilestoneId={
            selectedMilestoneId
          }
          selectedDiscoveryKey={
            selectedDiscoveryKey
          }
          selectedDecorationPlacementId={
            selectedDecorationPlacementId
          }
          discoveries={
            discoveries
          }
          legendaryCompanionIds={
            legendaryCompanionIds
          }
          builderPlacements={
            builderPlacements
          }
          onBuilderDragStart={
            startBuilderDrag
          }
          selectedLegendaryId={
            selectedLegendaryId
          }
          onSelectMilestone={
            selectMilestone
          }
          onSelectDiscovery={
            selectDiscovery
          }
          onSelectDecoration={
            selectDecoration
          }
          onSelectLegendary={
            selectLegendary
          }
          controlsRef={
            controlsRef
          }
          velocityRef={
            velocityRef
          }
          onNovaProject={
            updateNovaOverlay
          }
        />
      </Canvas>

      {/*
       * Only Nova's transparent artwork is a native overlay. Its position and
       * scale come from a real anchor above the 3D pedestal inside the Canvas,
       * so it follows orbit, tilt, zoom, focus, and Island rotation.
       */}
      <View
        ref={novaOverlayRef}
        pointerEvents="none"
        style={
          styles.novaResidentWrap
        }
      >
        <Image
          source={
            NOVA_ISLAND_MASCOT_ART
          }
          style={
            styles.novaResidentImage
          }
          resizeMode="contain"
        />
      </View>

      <View
        pointerEvents="box-none"
        style={
          StyleSheet.absoluteFill
        }
      >
        <View
          pointerEvents="none"
          style={
            styles.topRow
          }
        >
          <View
            style={
              styles.timePill
            }
          >
            <Ionicons
              name={
                palette.label ===
                "Night"
                  ? "moon"
                  : palette.label ===
                    "Day"
                  ? "sunny"
                  : "partly-sunny"
              }
              color="#ffffff"
              size={14}
            />
            <Text
              style={
                styles.timeText
              }
            >
              {palette.label} · Local
              time
            </Text>
          </View>

          <View
            style={
              styles.levelPill
            }
          >
            <Text
              style={
                styles.levelText
              }
            >
              LEVEL {level}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={resetView}
          style={({ pressed }) => [
            styles.resetButton,
            {
              opacity: pressed
                ? 0.7
                : 1,
            },
          ]}
        >
          <Ionicons
            name="scan-outline"
            color="#e0f2fe"
            size={18}
          />
          <Text
            style={
              styles.resetText
            }
          >
            Full view
          </Text>
        </Pressable>

        <View
          pointerEvents="none"
          style={
            styles.selectedCard
          }
        >
          <View
            style={
              styles.selectedTop
            }
          >
            <Text
              numberOfLines={1}
              style={
                styles.selectedTitle
              }
            >
              {selectedTitle}
            </Text>

            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    selectedStatusBackground,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      selectedStatusColor,
                  },
                ]}
              >
                {selectedStatusLabel}
              </Text>
            </View>
          </View>

          <Text
            numberOfLines={2}
            style={
              styles.selectedLore
            }
          >
            {selectedLore}
          </Text>
        </View>

        <View
          pointerEvents="none"
          style={
            styles.hint
          }
        >
          <Ionicons
            name="hand-left-outline"
            color="#bae6fd"
            size={14}
          />
          <Text
            style={
              styles.hintText
            }
          >
            Drag to rotate · Pinch to
            zoom · Tap to explore
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      width: "100%",
      overflow: "hidden",
      backgroundColor:
        "#07152f",
    },
    novaResidentWrap: {
      position: "absolute",
      left: 0,
      top: 0,
      width:
        NOVA_SPRITE_BASE_WIDTH,
      height:
        NOVA_SPRITE_BASE_HEIGHT,
      opacity: 0,
      zIndex: 4,
    },
    novaResidentImage: {
      width: "100%",
      height: "100%",
    },
    topRow: {
      position: "absolute",
      top: 12,
      left: 12,
      right: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 8,
    },
    timePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.24)",
      backgroundColor:
        "rgba(2,6,23,0.58)",
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    timeText: {
      color: "#f8fafc",
      fontSize: 10,
      fontWeight: "800",
    },
    levelPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        "rgba(103,232,249,0.42)",
      backgroundColor:
        "rgba(8,145,178,0.22)",
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    levelText: {
      color: "#a5f3fc",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
    resetButton: {
      position: "absolute",
      top: 52,
      right: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        "rgba(186,230,253,0.35)",
      backgroundColor:
        "rgba(2,6,23,0.72)",
      paddingHorizontal: 10,
    },
    resetText: {
      color: "#e0f2fe",
      fontSize: 10,
      fontWeight: "800",
    },
    selectedCard: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 42,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        "rgba(103,232,249,0.34)",
      backgroundColor:
        "rgba(2,6,23,0.76)",
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    selectedTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    selectedTitle: {
      flex: 1,
      color: "#f8fafc",
      fontSize: 13,
      fontWeight: "900",
    },
    statusPill: {
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 4,
    },
    statusText: {
      fontSize: 8.5,
      fontWeight: "900",
      letterSpacing: 0.42,
    },
    selectedLore: {
      color: "#cbd5e1",
      fontSize: 10.5,
      lineHeight: 15,
      marginTop: 5,
    },
    hint: {
      position: "absolute",
      left: 12,
      bottom: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      backgroundColor:
        "rgba(2,6,23,0.68)",
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    hintText: {
      color: "#bae6fd",
      fontSize: 9.5,
      fontWeight: "700",
    },
  });
