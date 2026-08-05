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
} from "@react-three/fiber/native";
import * as THREE from "three";

import {
  ISLAND_MILESTONES,
  type IslandMilestone,
} from "../../context/IslandContext";

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
  selectedMilestoneId: string;
  selectedDiscoveryKey: string | null;
  discoveries: Island3DDiscovery[];
  legendaryCompanionIds?: string[];
  onSelectMilestone: (
    milestoneId: string
  ) => void;
  onSelectDiscovery: (
    discoveryKey: string
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
  -2.3,
  0.8,
  1.22,
];

const NOVA_SPRITE_BASE_WIDTH = 62;
const NOVA_SPRITE_BASE_HEIGHT = 93;

const LANDMARK_POSITIONS: Record<
  string,
  Vec3
> = {
  // Central island — completed before any outer realm appears.
  study_grove: [
    -3.45,
    1.08,
    -0.85,
  ],
  starlight_garden: [
    -2.25,
    0.98,
    2.15,
  ],
  nova_library: [
    0.15,
    1.12,
    -1.15,
  ],
  whisperwind_mill: [
    -1.85,
    1.08,
    -2.75,
  ],
  learning_falls: [
    2.45,
    0.82,
    2.05,
  ],
  moonwell: [
    -0.35,
    0.98,
    1.35,
  ],
  sky_observatory: [
    3.2,
    1.1,
    -0.95,
  ],
  companion_habitat: [
    1.35,
    0.94,
    -3.25,
  ],

  // Outer realms — question beacons only until their land unlocks.
  castle_reach: [
    -5.25,
    1.12,
    -0.65,
  ],
  starport_dock: [
    5.25,
    1.05,
    1.1,
  ],
  crystal_wilds: [
    1.0,
    1.08,
    -5.15,
  ],
  moon_temple: [
    -0.75,
    1.08,
    4.9,
  ],
};

const DISCOVERY_ZONE_POSITIONS: Record<
  Island3DZone,
  Vec3
> = {
  grove: [
    -2.7,
    1.02,
    0.55,
  ],
  garden: [
    -1.35,
    0.94,
    2.85,
  ],
  library: [
    0.75,
    1.02,
    -0.55,
  ],
  waterfall: [
    2.65,
    0.8,
    1.35,
  ],
  observatory: [
    2.7,
    1.0,
    -1.85,
  ],
  habitat: [
    0.35,
    0.92,
    -3.55,
  ],
  open_grass: [
    -0.45,
    0.96,
    1.35,
  ],
};

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
        -6 + t * 4,
        3.5 + t * 2,
        -8,
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
        -5 + arc * 10,
        6.6 +
          Math.sin(
            arc * Math.PI
          ) *
            1.2,
        -8,
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
        4 + t * 2,
        5 - t * 2.2,
        -8,
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
      -5 + moonArc * 10,
      5.4 +
        Math.sin(
          moonArc * Math.PI
        ) *
          0.9,
      -8,
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

function IslandBase() {
  return (
    <group>
      <mesh
        position={[
          0,
          0.15,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            5.35,
            4.85,
            0.95,
            48,
          ]}
        />
        <meshStandardMaterial
          color="#3ba86c"
          roughness={0.9}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.68,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            5.2,
            5.28,
            0.22,
            48,
          ]}
        />
        <meshStandardMaterial
          color="#72dc91"
          roughness={0.84}
        />
      </mesh>

      <mesh
        position={[
          0,
          -2.3,
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
            4.9,
            5.1,
            42,
          ]}
        />
        <meshStandardMaterial
          color="#644638"
          roughness={1}
        />
      </mesh>

      <mesh
        position={[
          -1.15,
          -1.85,
          0.65,
        ]}
        rotation={[
          Math.PI,
          0,
          0,
        ]}
        scale={[
          0.72,
          0.72,
          0.72,
        ]}
      >
        <coneGeometry
          args={[
            2.7,
            4.25,
            24,
          ]}
        />
        <meshStandardMaterial
          color="#765547"
          roughness={1}
        />
      </mesh>

      {[
        [-3.5, -1.05, 1.1],
        [2.8, -1.2, -1.45],
        [0.4, -2.3, 1.5],
      ].map(
        (position, index) => (
          <mesh
            key={index}
            position={
              position as Vec3
            }
            rotation={[
              Math.PI,
              index * 0.8,
              0,
            ]}
            scale={[
              0.45,
              0.45,
              0.45,
            ]}
          >
            <coneGeometry
              args={[
                1.5,
                3.2,
                14,
              ]}
            />
            <meshStandardMaterial
              color="#52382f"
              roughness={1}
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
          -5.15,
          0.08,
          -0.7,
        ]}
        scale={[
          1.12,
          1,
          0.94,
        ]}
        connectorPosition={[
          -3.8,
          0.57,
          -0.62,
        ]}
        connectorScale={[
          2.7,
          0.34,
          1.35,
        ]}
        grassColor="#3ca66a"
        stoneColor="#604137"
      />

      <IslandExpansion
        level={level}
        requiredLevel={15}
        center={[
          5.0,
          0.04,
          1.05,
        ]}
        scale={[
          1.12,
          1,
          0.92,
        ]}
        connectorPosition={[
          3.7,
          0.56,
          0.82,
        ]}
        connectorScale={[
          2.7,
          0.34,
          1.28,
        ]}
        grassColor="#369f69"
        stoneColor="#594039"
      />

      <IslandExpansion
        level={level}
        requiredLevel={18}
        center={[
          1.0,
          0.08,
          -5.0,
        ]}
        scale={[
          0.98,
          1,
          1.12,
        ]}
        connectorPosition={[
          0.7,
          0.58,
          -3.72,
        ]}
        connectorScale={[
          1.32,
          0.34,
          2.75,
        ]}
        grassColor="#389f68"
        stoneColor="#564039"
      />

      <IslandExpansion
        level={level}
        requiredLevel={21}
        center={[
          -0.7,
          0.08,
          4.72,
        ]}
        scale={[
          1.02,
          1,
          1.14,
        ]}
        connectorPosition={[
          -0.48,
          0.58,
          3.55,
        ]}
        connectorScale={[
          1.38,
          0.34,
          2.65,
        ]}
        grassColor="#41a96e"
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

function LandmarkObject({
  milestone,
  level,
  selected,
  onSelect,
}: {
  milestone: IslandMilestone;
  level: number;
  selected: boolean;
  onSelect: (
    milestoneId: string,
    position: Vec3
  ) => void;
}) {
  const position =
    LANDMARK_POSITIONS[
      milestone.id
    ] ?? DEFAULT_TARGET;

  const unlocked =
    level >= milestone.level;

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
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(
          milestone.id,
          position
        );
      }}
    >
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
  const star = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (star.current) {
      star.current.rotation.y += delta * 0.75;
    }
  });

  return (
    <group scale={0.82}>
      <mesh
        position={[0, 0.54, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.48, 0.075, 12, 42]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#2563eb"
          emissiveIntensity={0.42}
          metalness={0.35}
          roughness={0.28}
        />
      </mesh>

      <mesh
        position={[0, 0.54, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.28, 0.045, 10, 36]} />
        <meshBasicMaterial color="#fde68a" />
      </mesh>

      <group ref={star} position={[0, 0.54, 0.02]}>
        <MiniStar scale={1.7} color="#fff3a8" />
      </group>

      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.055, 0.075, 0.84, 10]} />
        <meshStandardMaterial
          color="#475569"
          metalness={0.45}
          roughness={0.36}
        />
      </mesh>

      <mesh position={[0, -0.28, 0]}>
        <cylinderGeometry args={[0.3, 0.38, 0.12, 20]} />
        <meshStandardMaterial color="#334155" roughness={0.62} />
      </mesh>
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

function FriendshipResidentVisual({
  visualKey,
  accent,
}: {
  visualKey: FriendshipVisualKey | null;
  accent: string;
}) {
  const root = useRef<THREE.Group>(null);
  const detail = useRef<THREE.Group>(null);

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
          0.14 + Math.sin(time * 2) * 0.045;
        root.current.rotation.y += delta * 0.32;
        break;

      case "party_3d_2":
        root.current.position.y =
          0.14 + Math.sin(time * 2.15) * 0.05;
        root.current.rotation.y += delta * 0.62;
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
        <group ref={root} scale={0.76}>
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.34, 20, 16]} />
            <meshStandardMaterial
              color={accent}
              emissive="#2563eb"
              emissiveIntensity={0.24}
              roughness={0.46}
            />
          </mesh>

          {eyes}

          <group ref={detail} position={[0.5, 0.5, 0]}>
            <MiniStar color="#fff3a8" />
          </group>
        </group>
      );

    case "party_3d":
    case "party_3d_2": {
      const neon =
        visualKey === "party_3d_2";

      return (
        <group ref={root} scale={0.72}>
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.34, 20, 16]} />
            <meshStandardMaterial
              color={accent}
              emissive={neon ? "#7c3aed" : "#be185d"}
              emissiveIntensity={neon ? 0.5 : 0.24}
              metalness={neon ? 0.32 : 0.12}
              roughness={0.36}
            />
          </mesh>

          <mesh
            position={[0, 0.86, 0]}
            rotation={[0, 0, -0.12]}
          >
            <coneGeometry args={[0.24, 0.56, 18]} />
            <meshStandardMaterial
              color={neon ? "#22d3ee" : "#facc15"}
              emissive={neon ? "#0891b2" : "#ca8a04"}
              emissiveIntensity={0.28}
            />
          </mesh>

          {[
            [-0.45, 0.58, 0.08, "#38bdf8"],
            [0.44, 0.54, -0.04, "#facc15"],
            [-0.3, 0.12, -0.1, "#f472b6"],
          ].map(([x, y, z, color], index) => (
            <mesh
              key={index}
              position={[x as number, y as number, z as number]}
              rotation={[0, 0, index * 0.7]}
              scale={[0.055, 0.11, 0.035]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={color as string} />
            </mesh>
          ))}

          {neon ? (
            <mesh
              position={[0, 0.35, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[0.48, 0.035, 8, 30]} />
              <meshBasicMaterial color="#67e8f9" />
            </mesh>
          ) : null}
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

  const position =
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

  const marker =
    useRef<THREE.Group>(
      null
    );

  useFrame(
    ({ clock }) => {
      if (!marker.current) {
        return;
      }

      /*
       * Real keepsakes stay planted in the ground. Recognizable residents
       * animate inside their own models. Only future unknown placeholders
       * retain the original floating-and-spinning marker behavior.
       */
      if (hasCustomVisual) {
        marker.current.position.y =
          position[1];

        marker.current.rotation.y =
          0;

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

      marker.current.rotation.y +=
        discovery.kind ===
        "keepsake"
          ? 0.012
          : 0.004;
    }
  );

  return (
    <group
      ref={marker}
      position={position}
      onClick={(event) => {
        event.stopPropagation();

        onSelect(
          discovery.key,
          position
        );
      }}
    >
      {selected ? (
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
            hasCustomVisual
              ? 0.045
              : 0.08
          }
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function IslandWorld({
  level,
  palette,
  selectedMilestoneId,
  selectedDiscoveryKey,
  discoveries,
  legendaryCompanionIds,
  selectedLegendaryId,
  onSelectMilestone,
  onSelectDiscovery,
  onSelectLegendary,
  controlsRef,
  velocityRef,
  onNovaProject,
}: {
  level: number;
  palette: TimePalette;
  selectedMilestoneId: string;
  selectedDiscoveryKey: string | null;
  discoveries: Island3DDiscovery[];
  legendaryCompanionIds: string[];
  selectedLegendaryId: LegendaryIslandId | null;
  onSelectMilestone: (
    milestoneId: string,
    position: Vec3
  ) => void;
  onSelectDiscovery: (
    discoveryKey: string,
    position: Vec3
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
  return (
    <>
      <fog
        attach="fog"
        args={[
          palette.skyTop,
          13,
          34,
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
        <IslandBase />

        <IslandExpansions
          level={level}
        />

        <MagicWisps
          level={level}
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

export default function NovaIsland3DScene({
  level,
  height = 450,
  selectedMilestoneId,
  selectedDiscoveryKey,
  discoveries,
  legendaryCompanionIds = [],
  onSelectMilestone,
  onSelectDiscovery,
  onInteractionChange,
}: Props) {
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

  const fullViewDistance =
    legendaryCompanionIds.length > 0
      ? 21.4
      : 17.2;

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
    });

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
        fullViewDistance;

      controlsRef.current.desiredAzimuth =
        0.58;

      controlsRef.current.desiredPolar =
        0.98;

      velocityRef.current = {
        azimuth: 0,
        polar: 0,
      };
    }, [fullViewDistance]);

  const selectMilestone =
    useCallback(
      (
        milestoneId: string,
        position: Vec3
      ) => {
        setSelectedLegendaryId(
          null
        );

        onSelectMilestone(
          milestoneId
        );

        focusPosition(
          position,
          7.3
        );
      },
      [
        focusPosition,
        onSelectMilestone,
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

        onSelectDiscovery(
          discoveryKey
        );

        focusPosition(
          position,
          6.2
        );
      },
      [
        focusPosition,
        onSelectDiscovery,
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

        focusPosition(
          legendary.position,
          5.25
        );
      },
      [focusPosition]
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
                ) > 1.5 ||
                Math.abs(
                  gesture.dy
                ) > 1.5
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
                ) > 1.5 ||
                Math.abs(
                  gesture.dy
                ) > 1.5
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
                };

              velocityRef.current =
                {
                  azimuth: 0,
                  polar: 0,
                };
            },

          onPanResponderMove:
            (
              event,
              gesture
            ) => {
              const touches =
                event.nativeEvent
                  .touches;

              if (
                touches.length >= 2
              ) {
                const currentPinch =
                  distanceBetweenTouches(
                    touches
                  );

                const startingPinch =
                  Math.max(
                    1,
                    gestureStartRef
                      .current
                      .pinchDistance
                  );

                const ratio =
                  currentPinch /
                  startingPinch;

                const pinchTarget =
                  clamp(
                    gestureStartRef
                      .current
                      .distance /
                      Math.pow(
                        ratio,
                        0.72
                      ),
                    6,
                    21
                  );

                controlsRef.current.desiredDistance =
                  damp(
                    controlsRef.current.desiredDistance,
                    pinchTarget,
                    15,
                    1 / 60
                  );

                return;
              }

              controlsRef.current.desiredAzimuth =
                gestureStartRef
                  .current
                  .azimuth -
                gesture.dx *
                  0.0062;

              controlsRef.current.desiredPolar =
                clamp(
                  gestureStartRef
                    .current
                    .polar +
                    gesture.dy *
                      0.0038,
                  0.5,
                  1.34
                );
            },

          onPanResponderRelease:
            (
              _,
              gesture
            ) => {
              velocityRef.current =
                {
                  azimuth:
                    -gesture.vx *
                    0.62,
                  polar:
                    gesture.vy *
                    0.34,
                };

              setInteractionActive(
                false
              );
            },

          onPanResponderTerminate:
            () => {
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
      [setInteractionActive]
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

  const unlocked =
    level >=
    selectedMilestone.level;

  const selectedTitle =
    selectedLegendary?.title ??
    selectedDiscovery?.title ??
    (unlocked
      ? selectedMilestone.title
      : "Unknown Discovery");

  const selectedLore =
    selectedLegendary
      ? selectedLegendary.description
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
      onTouchEnd={() =>
        setInteractionActive(
          false
        )
      }
      onTouchCancel={() =>
        setInteractionActive(
          false
        )
      }
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
          selectedMilestoneId={
            selectedMilestoneId
          }
          selectedDiscoveryKey={
            selectedDiscoveryKey
          }
          discoveries={
            discoveries
          }
          legendaryCompanionIds={
            legendaryCompanionIds
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
