// app/components/island3d/LegendarySatelliteIslands.tsx

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber/native";
import * as THREE from "three";

export type Vec3 = [number, number, number];

export type LegendaryIslandId =
  | "mechaOwl"
  | "chronoFox"
  | "axolotlOracle"
  | "astralNova"
  | "celestra"
  | "aetherwyrm";

export type LegendaryIslandInfo = {
  id: LegendaryIslandId;
  title: string;
  description: string;
  accent: string;
  position: Vec3;
  ownershipToken: string;
};

type Props = {
  ownedCompanionIds?: string[];
  selectedLegendaryId?: LegendaryIslandId | null;
  onSelectLegendary?: (
    legendary: LegendaryIslandInfo
  ) => void;
};

type SatelliteShellProps = {
  position: Vec3;
  accent: string;
  children: React.ReactNode;
};

/*
 * The four level-gated Island expansions occupy the west, east, north, and
 * south approaches and reach roughly 7.4 world units from the Island center.
 *
 * These six legendary satellites therefore use a rotated 9-unit orbit.
 * Their 0.84-unit footprints remain outside every current and future expansion
 * footprint, and neighboring legendary islands remain about 9 units apart.
 *
 * The scene increases its full-view camera distance whenever a legendary
 * satellite is present, so the wider safe orbit remains visible.
 */
export const LEGENDARY_SATELLITE_POSITIONS = {
  mechaOwl: [8.04, 1.5, 4.04] as Vec3,
  chronoFox: [0.53, 1.56, 8.98] as Vec3,
  axolotlOracle: [-7.52, 1.48, 4.95] as Vec3,
  astralNova: [-8.04, 1.52, -4.04] as Vec3,
  celestra: [-0.53, 1.64, -8.98] as Vec3,
  aetherwyrm: [7.52, 1.7, -4.95] as Vec3,
} as const;

export const LEGENDARY_ISLAND_INFO: Record<
  LegendaryIslandId,
  LegendaryIslandInfo
> = {
  mechaOwl: {
    id: "mechaOwl",
    title: "Mecha Owl's Clockwork Roost",
    description:
      "A mechanical lookout that scans Nova Island and strengthens achievement rewards.",
    accent: "#22d3ee",
    position: LEGENDARY_SATELLITE_POSITIONS.mechaOwl,
    ownershipToken: "mechaowl",
  },
  chronoFox: {
    id: "chronoFox",
    title: "Chrono Fox's Time Shrine",
    description:
      "A ringed sanctuary where moments stretch, granting extra time during every quiz.",
    accent: "#f59e0b",
    position: LEGENDARY_SATELLITE_POSITIONS.chronoFox,
    ownershipToken: "chronofox",
  },
  axolotlOracle: {
    id: "axolotlOracle",
    title: "Axolotl Oracle's Reflection Pool",
    description:
      "A protective oracle pool that can preserve a broken streak while its shield is charged.",
    accent: "#38bdf8",
    position: LEGENDARY_SATELLITE_POSITIONS.axolotlOracle,
    ownershipToken: "axolotl",
  },
  astralNova: {
    id: "astralNova",
    title: "Astral Nova's Star Garden",
    description:
      "A garden of certificate stars that blooms brighter whenever mastery is celebrated.",
    accent: "#e879f9",
    position: LEGENDARY_SATELLITE_POSITIONS.astralNova,
    ownershipToken: "astralnova",
  },
  celestra: {
    id: "celestra",
    title: "Celestra's Celestial Terrace",
    description:
      "A moonlit terrace whose constellations strengthen rewards earned through streaks.",
    accent: "#a78bfa",
    position: LEGENDARY_SATELLITE_POSITIONS.celestra,
    ownershipToken: "celestra",
  },
  aetherwyrm: {
    id: "aetherwyrm",
    title: "Aetherwyrm's Crystal Spire",
    description:
      "A soaring aether spire that amplifies every coin reward after all other bonuses apply.",
    accent: "#8b5cf6",
    position: LEGENDARY_SATELLITE_POSITIONS.aetherwyrm,
    ownershipToken: "aetherwyrm",
  },
};

export function getLegendaryIslandInfo(
  id: LegendaryIslandId | null | undefined
): LegendaryIslandInfo | null {
  return id ? LEGENDARY_ISLAND_INFO[id] ?? null : null;
}

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function ownsToken(tokens: string[], token: string): boolean {
  return tokens.some((value) => value.includes(token));
}

function ClickableLegendary({
  legendary,
  selected,
  onSelect,
  children,
}: {
  legendary: LegendaryIslandInfo;
  selected: boolean;
  onSelect?: (
    legendary: LegendaryIslandInfo
  ) => void;
  children: React.ReactNode;
}) {
  const selectionRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (!selectionRef.current) {
      return;
    }

    selectionRef.current.rotation.z +=
      delta * 0.48;

    const pulse =
      1 +
      Math.sin(
        clock.elapsedTime * 2.2
      ) *
        0.045;

    selectionRef.current.scale.set(
      pulse,
      pulse,
      pulse
    );
  });

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(legendary);
      }}
    >
      {children}

      {/*
       * Transparent hit volume makes the whole landmark easy to tap without
       * adding any visible geometry or covering nearby Island content.
       */}
      <mesh
        position={[
          legendary.position[0],
          legendary.position[1] + 0.62,
          legendary.position[2],
        ]}
      >
        <cylinderGeometry
          args={[1.1, 1.1, 2.5, 18]}
        />
        <meshBasicMaterial
          transparent
          opacity={0.001}
          depthWrite={false}
        />
      </mesh>

      {selected ? (
        <group
          position={[
            legendary.position[0],
            legendary.position[1] + 0.25,
            legendary.position[2],
          ]}
        >
          <mesh
            ref={selectionRef}
            rotation={[
              Math.PI / 2,
              0,
              0,
            ]}
          >
            <torusGeometry
              args={[
                1.03,
                0.045,
                8,
                44,
              ]}
            />
            <meshBasicMaterial
              color={legendary.accent}
              transparent
              opacity={0.9}
              depthWrite={false}
            />
          </mesh>

          <mesh
            rotation={[
              Math.PI / 2,
              0,
              0,
            ]}
            scale={1.18}
          >
            <torusGeometry
              args={[
                1.03,
                0.018,
                8,
                44,
              ]}
            />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.42}
              depthWrite={false}
            />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function SatelliteShell({
  position,
  accent,
  children,
}: SatelliteShellProps) {
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (haloRef.current) {
      haloRef.current.rotation.z += delta * 0.14;
    }
  });

  return (
    <group position={position}>
      <pointLight color={accent} intensity={0.52} distance={4.2} />

      <mesh position={[0, -0.55, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.82, 1.55, 9]} />
        <meshStandardMaterial
          color="#293247"
          roughness={0.82}
          metalness={0.08}
        />
      </mesh>

      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.84, 0.78, 0.2, 18]} />
        <meshStandardMaterial
          color="#2f8d5a"
          roughness={0.78}
        />
      </mesh>

      <mesh
        ref={haloRef}
        position={[0, 0.22, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.72, 0.022, 8, 40]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, -1.1, 0]} scale={1.5}>
        <sphereGeometry args={[0.52, 12, 10]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.04}
          depthWrite={false}
        />
      </mesh>

      <group position={[0, 0.3, 0]}>{children}</group>
    </group>
  );
}

function MechaOwlSatellite() {
  const gearRef = useRef<THREE.Mesh>(null);
  const owlRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (gearRef.current) {
      gearRef.current.rotation.z += delta * 0.8;
    }

    if (owlRef.current) {
      owlRef.current.position.y =
        0.68 + Math.sin(clock.elapsedTime * 1.8) * 0.035;
    }
  });

  return (
    <SatelliteShell
      position={LEGENDARY_SATELLITE_POSITIONS.mechaOwl}
      accent="#22d3ee"
    >
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.24, 0.34, 0.38, 10]} />
        <meshStandardMaterial
          color="#46566f"
          metalness={0.78}
          roughness={0.28}
        />
      </mesh>

      <mesh ref={gearRef} position={[0, 0.55, -0.08]}>
        <torusGeometry args={[0.46, 0.055, 8, 24]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#0891b2"
          emissiveIntensity={1.7}
          metalness={0.72}
          roughness={0.22}
        />
      </mesh>

      <group ref={owlRef} position={[0, 0.68, 0.08]} scale={0.72}>
        <mesh scale={[0.42, 0.52, 0.34]}>
          <sphereGeometry args={[0.55, 16, 12]} />
          <meshStandardMaterial
            color="#263449"
            metalness={0.82}
            roughness={0.26}
          />
        </mesh>

        <mesh position={[0, 0.38, 0.03]} scale={[0.52, 0.42, 0.4]}>
          <sphereGeometry args={[0.52, 16, 12]} />
          <meshStandardMaterial
            color="#64748b"
            metalness={0.68}
            roughness={0.26}
          />
        </mesh>

        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * 0.25, 0.4, 0.37]}
            scale={[0.09, 0.09, 0.06]}
          >
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#facc15"
              emissiveIntensity={3}
            />
          </mesh>
        ))}

        {[-1, 1].map((side) => (
          <mesh
            key={`wing-${side}`}
            position={[side * 0.34, 0.02, -0.01]}
            rotation={[0, 0, side * 0.55]}
            scale={[0.14, 0.44, 0.22]}
          >
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial
              color="#1e293b"
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>
    </SatelliteShell>
  );
}

function ChronoFoxSatellite() {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const crystalRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (outerRef.current) {
      outerRef.current.rotation.y += delta * 0.52;
      outerRef.current.rotation.x =
        0.38 + Math.sin(clock.elapsedTime * 0.7) * 0.08;
    }

    if (innerRef.current) {
      innerRef.current.rotation.y -= delta * 0.76;
      innerRef.current.rotation.z += delta * 0.24;
    }

    if (crystalRef.current) {
      crystalRef.current.position.y =
        0.7 + Math.sin(clock.elapsedTime * 1.5) * 0.06;
    }
  });

  return (
    <SatelliteShell
      position={LEGENDARY_SATELLITE_POSITIONS.chronoFox}
      accent="#f59e0b"
    >
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.31, 0.4, 0.25, 12]} />
        <meshStandardMaterial color="#7c4a20" metalness={0.58} />
      </mesh>

      <mesh ref={outerRef} position={[0, 0.72, 0]} rotation={[0.35, 0, 0.2]}>
        <torusGeometry args={[0.5, 0.035, 8, 36]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={2}
          metalness={0.72}
          roughness={0.18}
        />
      </mesh>

      <mesh ref={innerRef} position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.026, 8, 32]} />
        <meshStandardMaterial
          color="#fde68a"
          emissive="#fbbf24"
          emissiveIntensity={1.8}
        />
      </mesh>

      <group ref={crystalRef} position={[0, 0.7, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial
            color="#fef3c7"
            emissive="#f59e0b"
            emissiveIntensity={2.2}
          />
        </mesh>
        <mesh position={[0, -0.16, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.13, 0.28, 6]} />
          <meshStandardMaterial
            color="#fb923c"
            emissive="#f59e0b"
            emissiveIntensity={1.4}
          />
        </mesh>
      </group>
    </SatelliteShell>
  );
}

function AxolotlOracleSatellite() {
  const bubbleRef = useRef<THREE.Group>(null);
  const poolRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (bubbleRef.current) {
      bubbleRef.current.rotation.y += delta * 0.22;
      bubbleRef.current.position.y =
        0.24 + Math.sin(clock.elapsedTime * 1.25) * 0.04;
    }

    if (poolRef.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 1.1) * 0.025;
      poolRef.current.scale.set(pulse, 1, 2 - pulse);
    }
  });

  return (
    <SatelliteShell
      position={LEGENDARY_SATELLITE_POSITIONS.axolotlOracle}
      accent="#60a5fa"
    >
      <mesh position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.48, 0.1, 10, 36]} />
        <meshStandardMaterial color="#64748b" roughness={0.75} />
      </mesh>

      <mesh ref={poolRef} position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.07, 32]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={1.1}
          transparent
          opacity={0.82}
          roughness={0.15}
        />
      </mesh>

      <group position={[0, 0.55, 0.02]} scale={0.76}>
        <mesh scale={[0.5, 0.36, 0.42]}>
          <sphereGeometry args={[0.55, 16, 12]} />
          <meshStandardMaterial
            color="#f0abfc"
            emissive="#c026d3"
            emissiveIntensity={0.45}
          />
        </mesh>

        {[-1, 1].map((side) =>
          [-1, 0, 1].map((branch) => (
            <mesh
              key={`${side}-${branch}`}
              position={[side * 0.34, branch * 0.11, 0]}
              rotation={[0, 0, side * (0.7 + branch * 0.2)]}
            >
              <cylinderGeometry args={[0.025, 0.035, 0.24, 6]} />
              <meshStandardMaterial
                color="#f5d0fe"
                emissive="#e879f9"
                emissiveIntensity={1.2}
              />
            </mesh>
          ))
        )}

        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.16, 0.05, 0.36]} scale={0.055}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
        ))}
      </group>

      <group ref={bubbleRef} position={[0, 0.24, 0]}>
        {[
          [-0.38, 0.2, 0.18, 0.05],
          [0.32, 0.34, 0.08, 0.07],
          [0.08, 0.5, -0.3, 0.045],
        ].map(([x, y, z, size], index) => (
          <mesh key={index} position={[x, y, z]} scale={size}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial
              color="#dbeafe"
              emissive="#60a5fa"
              emissiveIntensity={1.5}
              transparent
              opacity={0.7}
            />
          </mesh>
        ))}
      </group>
    </SatelliteShell>
  );
}

function AstralNovaSatellite() {
  const orbitRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += delta * 0.18;
      orbitRef.current.position.y =
        0.62 + Math.sin(clock.elapsedTime * 1.15) * 0.035;
    }
  });

  const flowers = useMemo<Vec3[]>(
    () => [
      [-0.42, 0, -0.2],
      [-0.22, 0, 0.35],
      [0.12, 0, -0.36],
      [0.42, 0, 0.18],
    ],
    []
  );

  return (
    <SatelliteShell
      position={LEGENDARY_SATELLITE_POSITIONS.astralNova}
      accent="#e879f9"
    >
      {flowers.map(([x, y, z], index) => (
        <group key={index} position={[x, y + 0.15, z]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.015, 0.022, 0.3, 6]} />
            <meshStandardMaterial color="#65a30d" />
          </mesh>
          <mesh position={[0, 0.33, 0]} rotation={[0, index * 0.7, 0]}>
            <octahedronGeometry args={[0.09, 0]} />
            <meshStandardMaterial
              color={index % 2 ? "#fde047" : "#f0abfc"}
              emissive={index % 2 ? "#facc15" : "#d946ef"}
              emissiveIntensity={1.8}
            />
          </mesh>
        </group>
      ))}

      <group ref={orbitRef} position={[0, 0.62, 0]}>
        {[0, 1, 2].map((index) => {
          const angle = (index / 3) * Math.PI * 2;
          return (
            <mesh
              key={index}
              position={[
                Math.cos(angle) * 0.45,
                index * 0.08,
                Math.sin(angle) * 0.45,
              ]}
              scale={index === 1 ? 0.1 : 0.075}
            >
              <octahedronGeometry args={[1, 0]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive={index === 1 ? "#facc15" : "#d946ef"}
                emissiveIntensity={2.6}
              />
            </mesh>
          );
        })}
      </group>

      <mesh position={[0, 0.44, 0]} scale={[0.22, 0.28, 0.18]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial
          color="#f5d0fe"
          emissive="#a855f7"
          emissiveIntensity={0.9}
        />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.1, 0.72, 0]}
          scale={[0.07, 0.22, 0.07]}
          rotation={[0, 0, side * 0.1]}
        >
          <sphereGeometry args={[1, 12, 9]} />
          <meshStandardMaterial
            color="#f5d0fe"
            emissive="#a855f7"
            emissiveIntensity={0.75}
          />
        </mesh>
      ))}
    </SatelliteShell>
  );
}

function CelestraSatellite() {
  const starsRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.2;
      starsRef.current.rotation.z =
        Math.sin(clock.elapsedTime * 0.6) * 0.07;
    }
  });

  return (
    <SatelliteShell
      position={LEGENDARY_SATELLITE_POSITIONS.celestra}
      accent="#a78bfa"
    >
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.62, 0]}>
          <cylinderGeometry args={[0.07, 0.11, 1.05, 9]} />
          <meshStandardMaterial
            color="#e2e8f0"
            emissive="#818cf8"
            emissiveIntensity={0.35}
          />
        </mesh>
      ))}

      <mesh position={[0, 1.02, 0]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.45, 0.075, 9, 28, Math.PI]} />
        <meshStandardMaterial
          color="#ddd6fe"
          emissive="#8b5cf6"
          emissiveIntensity={0.9}
        />
      </mesh>

      <group ref={starsRef} position={[0, 0.82, -0.04]}>
        {[
          [-0.24, 0.06, 0],
          [0, 0.25, 0],
          [0.24, 0.02, 0],
          [0.11, -0.2, 0],
          [-0.15, -0.15, 0],
        ].map(([x, y, z], index) => (
          <mesh key={index} position={[x, y, z]} scale={index === 1 ? 0.075 : 0.052}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive={index % 2 ? "#7dd3fc" : "#c4b5fd"}
              emissiveIntensity={2.8}
            />
          </mesh>
        ))}
      </group>
    </SatelliteShell>
  );
}

function AetherwyrmSatellite() {
  const wyrmRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const segments = useMemo(
    () =>
      Array.from({ length: 11 }, (_, index) => {
        const t = index / 10;
        const angle = t * Math.PI * 2.05;
        return {
          position: [
            Math.cos(angle) * (0.43 - t * 0.08),
            t * 1.08,
            Math.sin(angle) * (0.43 - t * 0.08),
          ] as Vec3,
          scale: 0.105 - t * 0.025,
        };
      }),
    []
  );

  useFrame(({ clock }, delta) => {
    if (wyrmRef.current) {
      wyrmRef.current.rotation.y += delta * 0.26;
      wyrmRef.current.position.y =
        0.36 + Math.sin(clock.elapsedTime * 0.9) * 0.08;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.32;
    }
  });

  return (
    <SatelliteShell
      position={LEGENDARY_SATELLITE_POSITIONS.aetherwyrm}
      accent="#8b5cf6"
    >
      <mesh position={[0, 0.55, 0]}>
        <coneGeometry args={[0.44, 1.15, 7]} />
        <meshStandardMaterial
          color="#6250a8"
          emissive="#7c3aed"
          emissiveIntensity={0.75}
          metalness={0.32}
          roughness={0.24}
        />
      </mesh>

      <mesh position={[0, 1.05, 0]}>
        <octahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial
          color="#cffafe"
          emissive="#22d3ee"
          emissiveIntensity={2.1}
        />
      </mesh>

      <mesh ref={ringRef} position={[0, 1.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.48, 0.025, 8, 34]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={2}
        />
      </mesh>

      <group ref={wyrmRef} position={[0, 0.36, 0]}>
        {segments.map((segment, index) => (
          <mesh key={index} position={segment.position} scale={segment.scale}>
            <sphereGeometry args={[1, 12, 9]} />
            <meshStandardMaterial
              color={index % 2 ? "#a78bfa" : "#67e8f9"}
              emissive={index % 2 ? "#7c3aed" : "#0891b2"}
              emissiveIntensity={1.2}
              metalness={0.34}
              roughness={0.24}
            />
          </mesh>
        ))}
      </group>
    </SatelliteShell>
  );
}

export default function LegendarySatelliteIslands({
  ownedCompanionIds = [],
  selectedLegendaryId = null,
  onSelectLegendary,
}: Props) {
  const tokens = useMemo(
    () => ownedCompanionIds.map(normalizeToken),
    [ownedCompanionIds]
  );

  const ownedLegendaryIds =
    useMemo(
      () =>
        (
          Object.keys(
            LEGENDARY_ISLAND_INFO
          ) as LegendaryIslandId[]
        ).filter((id) =>
          ownsToken(
            tokens,
            LEGENDARY_ISLAND_INFO[id]
              .ownershipToken
          )
        ),
      [tokens]
    );

  const renderLegendary = (
    id: LegendaryIslandId,
    visual: React.ReactNode
  ) => {
    if (!ownedLegendaryIds.includes(id)) {
      return null;
    }

    const legendary =
      LEGENDARY_ISLAND_INFO[id];

    return (
      <ClickableLegendary
        key={id}
        legendary={legendary}
        selected={
          selectedLegendaryId === id
        }
        onSelect={
          onSelectLegendary
        }
      >
        {visual}
      </ClickableLegendary>
    );
  };

  return (
    <group>
      {renderLegendary(
        "mechaOwl",
        <MechaOwlSatellite />
      )}
      {renderLegendary(
        "chronoFox",
        <ChronoFoxSatellite />
      )}
      {renderLegendary(
        "axolotlOracle",
        <AxolotlOracleSatellite />
      )}
      {renderLegendary(
        "astralNova",
        <AstralNovaSatellite />
      )}
      {renderLegendary(
        "celestra",
        <CelestraSatellite />
      )}
      {renderLegendary(
        "aetherwyrm",
        <AetherwyrmSatellite />
      )}
    </group>
  );
}
