// app/components/island3d/IslandDecorationLayer.tsx
import React, { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber/native";
import * as THREE from "three";

import { useIslandBuilder } from "../../context/IslandBuilderContext";
import { useIslandDecorations } from "../../context/IslandDecorationContext";
import { useIslandKeepsakes } from "../../context/IslandKeepsakeContext";
import {
  ISLAND_DECORATION_CATALOG_BY_ID,
  type IslandDecorationCatalogItem,
} from "../../_lib/islandDecorationCatalog";

const BUSH_BERRIES: Array<[number, number, number]> = [
  [-0.3, 0.42, 0.24],
  [-0.05, 0.6, 0.28],
  [0.25, 0.48, 0.22],
  [0.34, 0.37, -0.08],
  [0.05, 0.65, -0.18],
  [-0.25, 0.5, -0.18],
];

const MUSHROOM_SPOTS: Array<[number, number, number]> = [
  [-0.16, 0.61, 0.2],
  [0.14, 0.64, 0.18],
  [0.22, 0.58, -0.08],
  [-0.2, 0.58, -0.12],
];


function StarFlowerModel() {
  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outer = 0.34;
    const inner = 0.145;

    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }

    shape.closePath();
    return shape;
  }, []);

  return (
    <group>
      <mesh position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.028, 0.045, 0.54, 8]} />
        <meshStandardMaterial color="#36a95f" roughness={0.85} />
      </mesh>

      <mesh position={[-0.08, 0.25, 0]} rotation={[0.1, 0, -0.75]} scale={[0.17, 0.045, 0.08]}>
        <sphereGeometry args={[1, 10, 7]} />
        <meshStandardMaterial color="#4ade80" roughness={0.8} />
      </mesh>

      <mesh position={[0.08, 0.34, 0.02]} rotation={[-0.08, 0, 0.78]} scale={[0.16, 0.04, 0.075]}>
        <sphereGeometry args={[1, 10, 7]} />
        <meshStandardMaterial color="#22c55e" roughness={0.8} />
      </mesh>

      <mesh position={[0, 0.525, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <extrudeGeometry
          args={[
            starShape,
            {
              depth: 0.045,
              bevelEnabled: true,
              bevelSegments: 1,
              steps: 1,
              bevelSize: 0.018,
              bevelThickness: 0.018,
            },
          ]}
        />
        <meshStandardMaterial
          color="#f9a8d4"
          emissive="#ec4899"
          emissiveIntensity={0.16}
          roughness={0.66}
        />
      </mesh>

      <mesh position={[0, 0.555, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.77, 0.77, 1]}>
        <shapeGeometry args={[starShape]} />
        <meshStandardMaterial
          color="#fdf2f8"
          emissive="#f472b6"
          emissiveIntensity={0.22}
          side={THREE.DoubleSide}
          roughness={0.58}
        />
      </mesh>

      <mesh position={[0, 0.59, 0]}>
        <sphereGeometry args={[0.078, 14, 10]} />
        <meshStandardMaterial
          color="#fde68a"
          emissive="#f59e0b"
          emissiveIntensity={0.72}
          roughness={0.5}
        />
      </mesh>

      <pointLight position={[0, 0.62, 0]} color="#fef3c7" intensity={0.24} distance={1.45} />
    </group>
  );
}

function AnimatedFountainRipples() {
  const refs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    refs.current.forEach((mesh, index) => {
      if (!mesh) return;

      const phase = (time * 0.34 + index / 3) % 1;
      const scale = 0.72 + phase * 1.72;
      mesh.scale.set(scale, scale, 1);

      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 0.62 * (1 - phase));
    });
  });

  return (
    <group>
      {[0, 1, 2].map((index) => (
        <mesh
          key={`water-ripple-${index}`}
          ref={(mesh) => {
            refs.current[index] = mesh;
          }}
          position={[0, 0.238 + index * 0.004, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.22, 0.012, 6, 28]} />
          <meshBasicMaterial
            color="#bae6fd"
            transparent
            opacity={0.58}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}


function ColoredBushModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  const clusters: Array<[number, number, number, number]> = [
    [-0.3, 0.3, 0.02, 0.38],
    [0.28, 0.31, 0.08, 0.36],
    [-0.03, 0.52, -0.08, 0.34],
    [0.02, 0.23, -0.3, 0.31],
  ];

  return (
    <group>
      {clusters.map(([x, y, z, radius], index) => (
        <mesh key={`color-bush-${index}`} position={[x, y, z]}>
          <sphereGeometry args={[radius, 12, 9]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? item.accent : secondary}
            emissive={secondary}
            emissiveIntensity={0.08}
            roughness={0.94}
          />
        </mesh>
      ))}
      {BUSH_BERRIES.slice(0, 7).map(([x, y, z], index) => (
        <mesh key={`color-berry-${index}`} position={[x, y, z]}>
          <sphereGeometry args={[0.05, 9, 7]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#f8fafc" : secondary}
            emissive={item.accent}
            emissiveIntensity={0.32}
            roughness={0.55}
          />
        </mesh>
      ))}
    </group>
  );
}

function CherryTreeModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  const blossoms: Array<[number, number, number, number]> = [
    [-0.34, 1.46, 0.03, 0.48],
    [0.32, 1.5, 0.11, 0.5],
    [0.02, 1.79, -0.08, 0.45],
    [0.08, 1.34, -0.42, 0.4],
    [-0.04, 1.45, 0.38, 0.38],
  ];

  return (
    <group>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.12, 0.23, 1.4, 11]} />
        <meshStandardMaterial color="#6b3f2c" roughness={0.98} />
      </mesh>
      <mesh position={[0.2, 1.08, 0]} rotation={[0, 0, -0.74]}>
        <cylinderGeometry args={[0.05, 0.085, 0.7, 8]} />
        <meshStandardMaterial color="#7c4a35" roughness={0.98} />
      </mesh>
      <mesh position={[-0.2, 1.16, 0]} rotation={[0.08, 0, 0.76]}>
        <cylinderGeometry args={[0.05, 0.085, 0.66, 8]} />
        <meshStandardMaterial color="#7c4a35" roughness={0.98} />
      </mesh>

      {blossoms.map(([x, y, z, radius], index) => (
        <mesh key={`blossom-${index}`} position={[x, y, z]} scale={[1.08, 0.8, 1]}>
          <sphereGeometry args={[radius, 13, 9]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? item.accent : secondary}
            emissive={secondary}
            emissiveIntensity={0.11}
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

function AlienTreeModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;

  return (
    <group>
      <mesh position={[0, 0.72, 0]} rotation={[0.04, 0, -0.08]}>
        <cylinderGeometry args={[0.11, 0.28, 1.44, 9]} />
        <meshStandardMaterial color="#31213f" emissive="#581c87" emissiveIntensity={0.12} roughness={0.86} />
      </mesh>

      {[
        [0.23, 1.08, 0.02, -0.78],
        [-0.24, 1.19, -0.04, 0.82],
        [0.02, 1.37, -0.16, 0.18],
      ].map(([x, y, z, rz], index) => (
        <mesh key={`alien-branch-${index}`} position={[x, y, z]} rotation={[0.08 * index, 0.2 * index, rz]}>
          <cylinderGeometry args={[0.045, 0.085, 0.72, 7]} />
          <meshStandardMaterial color="#432452" emissive="#7e22ce" emissiveIntensity={0.13} roughness={0.85} />
        </mesh>
      ))}

      {[
        [-0.35, 1.56, 0.03, 0.48],
        [0.34, 1.55, 0.12, 0.5],
        [0.02, 1.86, -0.08, 0.43],
        [0.02, 1.42, -0.42, 0.39],
      ].map(([x, y, z, radius], index) => (
        <mesh key={`alien-crown-${index}`} position={[x, y, z]} rotation={[0.2, 0.3 * index, 0.1]}>
          <dodecahedronGeometry args={[radius, 0]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? item.accent : secondary}
            emissive={index % 2 === 0 ? secondary : item.accent}
            emissiveIntensity={0.38}
            metalness={0.08}
            roughness={0.62}
          />
        </mesh>
      ))}

      <mesh position={[0, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.025, 6, 28]} />
        <meshStandardMaterial color={secondary} emissive={secondary} emissiveIntensity={0.72} />
      </mesh>
      <pointLight position={[0, 1.55, 0]} color={item.accent} intensity={0.42} distance={3.2} />
    </group>
  );
}

function RainbowModel({ item }: { item: IslandDecorationCatalogItem }) {
  const moon = item.id === "moonbow";
  const colors = moon
    ? ["#67e8f9", "#60a5fa", "#818cf8", "#a78bfa", "#e879f9"]
    : ["#fb7185", "#fb923c", "#fde047", "#4ade80", "#38bdf8", "#a78bfa"];

  return (
    <group position={[0, 0.03, 0]}>
      {colors.map((color, index) => {
        const radius = 0.98 - index * 0.105;
        return (
          <mesh key={`rainbow-${color}`}>
            <torusGeometry args={[radius, 0.055, 8, 42, Math.PI]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={moon ? 0.36 : 0.16}
              roughness={0.55}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function CrystalModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  const crystals: Array<[number, number, number, number, number]> = [
    [0, 0.38, 0, 0.18, 0.78],
    [-0.28, 0.25, 0.05, 0.14, 0.5],
    [0.26, 0.28, 0.02, 0.15, 0.58],
    [0.12, 0.2, -0.24, 0.11, 0.4],
  ];

  return (
    <group>
      <mesh position={[0, 0.04, 0]} scale={[0.72, 0.18, 0.58]}>
        <dodecahedronGeometry args={[0.65, 0]} />
        <meshStandardMaterial color="#334155" roughness={0.88} />
      </mesh>
      {crystals.map(([x, y, z, radius, height], index) => (
        <mesh key={`crystal-${index}`} position={[x, y, z]}>
          <coneGeometry args={[radius, height, 6]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? item.accent : secondary}
            emissive={secondary}
            emissiveIntensity={0.42}
            metalness={0.16}
            roughness={0.42}
          />
        </mesh>
      ))}
      <pointLight position={[0, 0.48, 0]} color={item.accent} intensity={0.32} distance={2.2} />
    </group>
  );
}

function GlowPlantModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  const stems = [-0.3, -0.14, 0.04, 0.2, 0.34];

  return (
    <group>
      {stems.map((x, index) => {
        const height = 0.48 + (index % 3) * 0.13;
        return (
          <group key={`glow-stem-${index}`}>
            <mesh position={[x, height / 2, index % 2 ? 0.1 : -0.08]}>
              <cylinderGeometry args={[0.025, 0.04, height, 7]} />
              <meshStandardMaterial color="#1f7a5a" roughness={0.9} />
            </mesh>
            <mesh position={[x, height + 0.05, index % 2 ? 0.1 : -0.08]}>
              <sphereGeometry args={[0.105, 10, 7]} />
              <meshStandardMaterial
                color={index % 2 === 0 ? item.accent : secondary}
                emissive={index % 2 === 0 ? item.accent : secondary}
                emissiveIntensity={0.68}
                roughness={0.5}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}


function UfoModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;

  return (
    <group position={[0, 0.14, 0]}>
      <mesh position={[0, 0.26, 0]} scale={[1.25, 0.32, 1.25]}>
        <sphereGeometry args={[0.58, 20, 12]} />
        <meshStandardMaterial color="#334155" metalness={0.72} roughness={0.34} />
      </mesh>

      <mesh position={[0, 0.38, 0]} scale={[0.72, 0.45, 0.72]}>
        <sphereGeometry args={[0.52, 18, 12]} />
        <meshStandardMaterial
          color={secondary}
          emissive={item.accent}
          emissiveIntensity={0.3}
          transparent
          opacity={0.72}
          metalness={0.08}
          roughness={0.24}
        />
      </mesh>

      <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.64, 0.07, 10, 32]} />
        <meshStandardMaterial
          color={item.accent}
          emissive={item.accent}
          emissiveIntensity={0.78}
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>

      {[0, 1, 2, 3, 4, 5].map((index) => {
        const angle = (index / 6) * Math.PI * 2;
        const x = Math.cos(angle) * 0.54;
        const z = Math.sin(angle) * 0.54;

        return (
          <mesh key={`ufo-light-${index}`} position={[x, 0.12, z]}>
            <sphereGeometry args={[0.06, 10, 7]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? item.accent : secondary}
              emissive={index % 2 === 0 ? item.accent : secondary}
              emissiveIntensity={0.9}
            />
          </mesh>
        );
      })}

      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.38, 0.75, 18, 1, true]} />
        <meshBasicMaterial color={item.accent} transparent opacity={0.12} side={2} />
      </mesh>

      <pointLight position={[0, 0.18, 0]} color={item.accent} intensity={0.55} distance={3.4} />
    </group>
  );
}


function PineTreeModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  const tiers: Array<[number, number, string]> = [
    [0.78, 0.62, secondary],
    [1.15, 0.52, item.accent],
    [1.5, 0.4, secondary],
  ];
  return (
    <group>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.12, 0.22, 1.44, 10]} />
        <meshStandardMaterial color="#6b442d" roughness={0.95} />
      </mesh>
      {tiers.map(([y, radius, color], index) => (
        <mesh key={`pine-${index}`} position={[0, y, 0]}>
          <coneGeometry args={[radius, 0.78, 14]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} roughness={0.86} />
        </mesh>
      ))}
    </group>
  );
}

function PalmTreeModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  return (
    <group>
      <mesh position={[0, 0.85, 0]} rotation={[0, 0, -0.08]}>
        <cylinderGeometry args={[0.1, 0.18, 1.7, 10]} />
        <meshStandardMaterial color="#9a6a43" roughness={0.9} />
      </mesh>
      {angles.map((angle, index) => (
        <mesh
          key={`palm-leaf-${index}`}
          position={[Math.cos(angle) * 0.34, 1.72, Math.sin(angle) * 0.34]}
          rotation={[0, -angle, index % 2 ? -0.35 : 0.35]}
          scale={[0.72, 0.07, 0.2]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={index % 2 ? secondary : item.accent} emissive={index % 2 ? secondary : item.accent} emissiveIntensity={0.08} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.18, 12, 9]} />
        <meshStandardMaterial color={secondary} />
      </mesh>
    </group>
  );
}

function MeteorModel({ item }: { item: IslandDecorationCatalogItem }) {
  return (
    <group>
      <mesh position={[0, 0.34, 0]} rotation={[0.32, 0.48, -0.18]} scale={[1, 0.8, 0.9]}>
        <dodecahedronGeometry args={[0.52, 0]} />
        <meshStandardMaterial color="#4b3a35" roughness={0.96} />
      </mesh>
      {[[-0.18, 0.5, 0.28], [0.22, 0.38, 0.32], [0.05, 0.6, -0.2]].map(([x, y, z], index) => (
        <mesh key={`meteor-glow-${index}`} position={[x, y, z]} scale={[0.1, 0.05, 0.1]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={item.accent} emissive={item.accent} emissiveIntensity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function MoonRockModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  const rocks: Array<[number, number, number, number]> = [
    [-0.3, 0.18, 0.05, 0.38],
    [0.24, 0.22, 0.02, 0.46],
    [0, 0.34, -0.2, 0.52],
  ];
  return (
    <group>
      {rocks.map(([x, y, z, s], index) => (
        <mesh key={`moon-rock-${index}`} position={[x, y, z]} rotation={[0.2 * index, 0.5 * index, 0.08]} scale={s}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={index % 2 ? secondary : item.accent} roughness={0.98} />
        </mesh>
      ))}
    </group>
  );
}

function AlienMushroomModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  const mushrooms: Array<[number, number, number]> = [
    [-0.32, 0.05, 0.8],
    [0.28, -0.08, 1],
    [0.02, 0.22, 0.62],
  ];
  return (
    <group>
      {mushrooms.map(([x, z, s], index) => (
        <group key={`alien-mush-${index}`} position={[x, 0, z]} scale={s}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.055, 0.1, 0.5, 10]} />
            <meshStandardMaterial color="#dbeafe" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.54, 0]} scale={[1, 0.42, 1]}>
            <sphereGeometry args={[0.32, 16, 10]} />
            <meshStandardMaterial color={index % 2 ? secondary : item.accent} emissive={index % 2 ? secondary : item.accent} emissiveIntensity={0.45} roughness={0.36} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 0.55, 0]} color={item.accent} intensity={0.28} distance={2.4} />
    </group>
  );
}

function GrassPatchModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  const blades = [-0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36];
  return (
    <group>
      {blades.map((x, index) => (
        <mesh key={`grass-${index}`} position={[x, 0.18 + (index % 3) * 0.04, index % 2 ? 0.12 : -0.08]} rotation={[0, 0, (index - 3) * 0.06]}>
          <coneGeometry args={[0.055, 0.42 + (index % 2) * 0.08, 7]} />
          <meshStandardMaterial color={index % 2 ? secondary : item.accent} emissive={index % 2 ? secondary : item.accent} emissiveIntensity={0.18} />
        </mesh>
      ))}
    </group>
  );
}

function TinyPlanetModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  return (
    <group position={[0, 0.78, 0]}>
      <mesh>
        <sphereGeometry args={[0.46, 22, 16]} />
        <meshStandardMaterial color={item.accent} emissive={item.accent} emissiveIntensity={0.18} roughness={0.55} />
      </mesh>
      <mesh rotation={[1.05, 0.22, 0.28]}>
        <torusGeometry args={[0.68, 0.07, 10, 34]} />
        <meshStandardMaterial color={secondary} emissive={secondary} emissiveIntensity={0.36} metalness={0.2} roughness={0.4} />
      </mesh>
      <pointLight color={secondary} intensity={0.26} distance={2.8} />
    </group>
  );
}

function TelescopeModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  return (
    <group>
      {[-0.28, 0, 0.28].map((x, index) => (
        <mesh key={`telescope-leg-${index}`} position={[x, 0.42, index === 1 ? -0.18 : 0.08]} rotation={[0, 0, x * 0.45]}>
          <cylinderGeometry args={[0.025, 0.04, 0.86, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.42} />
        </mesh>
      ))}
      <mesh position={[0, 0.9, 0]} rotation={[0, 0, Math.PI / 2.8]}>
        <cylinderGeometry args={[0.12, 0.15, 1.0, 14]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0.4, 1.05, 0]} rotation={[0, 0, Math.PI / 2.8]}>
        <cylinderGeometry args={[0.16, 0.16, 0.1, 18]} />
        <meshStandardMaterial color={secondary} emissive={item.accent} emissiveIntensity={0.45} />
      </mesh>
    </group>
  );
}

function CosmicArchModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  return (
    <group>
      {[-0.78, 0.78].map((x, index) => (
        <mesh key={`arch-pillar-${index}`} position={[x, 0.72, 0]}>
          <cylinderGeometry args={[0.13, 0.18, 1.44, 8]} />
          <meshStandardMaterial color={index % 2 ? secondary : item.accent} emissive={index % 2 ? secondary : item.accent} emissiveIntensity={0.22} roughness={0.42} />
        </mesh>
      ))}
      <mesh position={[0, 1.42, 0]}>
        <torusGeometry args={[0.78, 0.1, 10, 42, Math.PI]} />
        <meshStandardMaterial color={secondary} emissive={item.accent} emissiveIntensity={0.5} metalness={0.24} roughness={0.34} />
      </mesh>
    </group>
  );
}

function FenceModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  return (
    <group>
      {[-0.75, 0, 0.75].map((x, index) => (
        <mesh key={`fence-post-${index}`} position={[x, 0.45, 0]}>
          <boxGeometry args={[0.12, 0.9, 0.12]} />
          <meshStandardMaterial color={index === 1 ? secondary : item.accent} emissive={item.accent} emissiveIntensity={0.16} />
        </mesh>
      ))}
      {[0.28, 0.62].map((y) => (
        <mesh key={`fence-rail-${y}`} position={[0, y, 0]}>
          <boxGeometry args={[1.55, 0.1, 0.09]} />
          <meshStandardMaterial color={secondary} emissive={secondary} emissiveIntensity={0.12} />
        </mesh>
      ))}
    </group>
  );
}

function PondModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  return (
    <group>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.92, 40]} />
        <meshStandardMaterial color={item.accent} emissive={item.accent} emissiveIntensity={0.22} transparent opacity={0.78} />
      </mesh>
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.08, 40]} />
        <meshStandardMaterial color={secondary} roughness={0.9} />
      </mesh>
      <pointLight position={[0, 0.24, 0]} color={item.accent} intensity={0.16} distance={2.2} />
    </group>
  );
}

function FloatingRockModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  return (
    <group>
      <mesh position={[0, 0.76, 0]} rotation={[0.18, 0.42, -0.1]} scale={[0.72, 0.9, 0.68]}>
        <dodecahedronGeometry args={[0.58, 0]} />
        <meshStandardMaterial color={secondary} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.22, 0]} scale={[1, 0.16, 1]}>
        <sphereGeometry args={[0.42, 16, 10]} />
        <meshBasicMaterial color={item.accent} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 0.42, 0]} color={item.accent} intensity={0.35} distance={2.6} />
    </group>
  );
}

function FlowerBedModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  const flowers: Array<[number, number, string]> = [
    [-0.44, -0.14, item.accent],
    [-0.22, 0.18, secondary],
    [0, -0.08, item.accent],
    [0.25, 0.16, secondary],
    [0.46, -0.12, item.accent],
  ];
  return (
    <group>
      <mesh position={[0, 0.08, 0]} scale={[1.25, 0.18, 0.72]}>
        <sphereGeometry args={[0.56, 18, 12]} />
        <meshStandardMaterial color="#5b3d2b" roughness={1} />
      </mesh>
      {flowers.map(([x, z, color], index) => (
        <group key={`flowerbed-${index}`} position={[x, 0.12, z]}>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.012, 0.018, 0.3, 6]} />
            <meshStandardMaterial color="#3f9b63" />
          </mesh>
          <mesh position={[0, 0.34, 0]} rotation={[0, 0, Math.PI / 4]}>
            <octahedronGeometry args={[0.11, 0]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function StarLanternModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  return (
    <group>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.04, 0.07, 1.24, 10]} />
        <meshStandardMaterial color="#475569" metalness={0.55} roughness={0.38} />
      </mesh>
      <mesh position={[0, 1.34, 0]} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={item.accent} emissive={secondary} emissiveIntensity={0.85} roughness={0.24} />
      </mesh>
      <pointLight position={[0, 1.34, 0]} color={item.accent} intensity={0.55} distance={3.2} />
    </group>
  );
}

function PortalModel({ item }: { item: IslandDecorationCatalogItem }) {
  const secondary = item.secondaryAccent ?? item.accent;
  return (
    <group position={[0, 0.98, 0]}>
      <mesh>
        <torusGeometry args={[0.84, 0.12, 12, 48]} />
        <meshStandardMaterial color={secondary} emissive={item.accent} emissiveIntensity={0.72} metalness={0.26} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -0.015]}>
        <circleGeometry args={[0.72, 40]} />
        <meshBasicMaterial color={item.accent} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <pointLight color={item.accent} intensity={0.52} distance={3.4} />
    </group>
  );
}

function Model({ item }: { item: IslandDecorationCatalogItem }) {
  if (item.model === "stone") {
    return (
      <group>
        <mesh position={[-0.18, 0.1, 0.02]} rotation={[0.12, 0.35, -0.08]} scale={[0.62, 0.3, 0.5]}>
          <dodecahedronGeometry args={[0.68, 0]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.98} />
        </mesh>
        <mesh position={[0.28, 0.08, -0.08]} rotation={[-0.08, -0.42, 0.12]} scale={[0.42, 0.24, 0.34]}>
          <dodecahedronGeometry args={[0.58, 0]} />
          <meshStandardMaterial color="#7f8b9c" roughness={1} />
        </mesh>
        <mesh position={[0.04, 0.045, 0.3]} rotation={[0.05, 0.75, 0]} scale={[0.25, 0.15, 0.22]}>
          <dodecahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color="#b1bac7" roughness={1} />
        </mesh>
      </group>
    );
  }

  if (item.model === "flower") {
    return <StarFlowerModel />;
  }

  if (item.model === "colored_bush") {
    return <ColoredBushModel item={item} />;
  }

  if (item.model === "cherry_tree") {
    return <CherryTreeModel item={item} />;
  }

  if (item.model === "alien_tree") {
    return <AlienTreeModel item={item} />;
  }

  if (item.model === "ufo") {
    return <UfoModel item={item} />;
  }

  if (item.model === "pine_tree") return <PineTreeModel item={item} />;
  if (item.model === "palm_tree") return <PalmTreeModel item={item} />;
  if (item.model === "meteor") return <MeteorModel item={item} />;
  if (item.model === "moon_rock") return <MoonRockModel item={item} />;
  if (item.model === "alien_mushroom") return <AlienMushroomModel item={item} />;
  if (item.model === "grass_patch") return <GrassPatchModel item={item} />;
  if (item.model === "tiny_planet") return <TinyPlanetModel item={item} />;
  if (item.model === "telescope") return <TelescopeModel item={item} />;
  if (item.model === "cosmic_arch") return <CosmicArchModel item={item} />;
  if (item.model === "fence") return <FenceModel item={item} />;
  if (item.model === "pond") return <PondModel item={item} />;
  if (item.model === "floating_rock") return <FloatingRockModel item={item} />;
  if (item.model === "flower_bed") return <FlowerBedModel item={item} />;
  if (item.model === "star_lantern") return <StarLanternModel item={item} />;
  if (item.model === "portal") return <PortalModel item={item} />;


  if (item.model === "rainbow") {
    return <RainbowModel item={item} />;
  }

  if (item.model === "crystal") {
    return <CrystalModel item={item} />;
  }

  if (item.model === "glow_plant") {
    return <GlowPlantModel item={item} />;
  }

  if (item.model === "bush") {
    return (
      <group>
        <mesh position={[-0.3, 0.3, 0.02]} scale={[1.05, 0.9, 0.95]}>
          <sphereGeometry args={[0.38, 12, 9]} />
          <meshStandardMaterial color="#25794d" roughness={1} />
        </mesh>
        <mesh position={[0.28, 0.31, 0.08]} scale={[1, 0.86, 0.94]}>
          <sphereGeometry args={[0.36, 12, 9]} />
          <meshStandardMaterial color="#329b5d" roughness={1} />
        </mesh>
        <mesh position={[-0.03, 0.52, -0.08]} scale={[1.08, 0.95, 1]}>
          <sphereGeometry args={[0.34, 12, 9]} />
          <meshStandardMaterial color="#3fbf72" roughness={0.98} />
        </mesh>
        <mesh position={[0.02, 0.23, -0.3]} scale={[0.9, 0.75, 0.85]}>
          <sphereGeometry args={[0.31, 11, 8]} />
          <meshStandardMaterial color="#24784a" roughness={1} />
        </mesh>

        {BUSH_BERRIES.map(([x, y, z], index) => (
          <mesh key={`berry-${index}`} position={[x, y, z]}>
            <sphereGeometry args={[0.055, 10, 7]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? "#f472b6" : "#c084fc"}
              emissive="#a855f7"
              emissiveIntensity={0.2}
              roughness={0.62}
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (item.model === "mushroom") {
    return (
      <group>
        <mesh position={[0, 0.23, 0]}>
          <cylinderGeometry args={[0.07, 0.12, 0.46, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.47, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.29, 18]} />
          <meshStandardMaterial color="#ddd6fe" emissive="#8b5cf6" emissiveIntensity={0.16} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.53, 0]} scale={[1.05, 0.48, 1.05]}>
          <sphereGeometry args={[0.34, 18, 11]} />
          <meshStandardMaterial color="#8b5cf6" emissive="#6d28d9" emissiveIntensity={0.42} roughness={0.62} />
        </mesh>
        {MUSHROOM_SPOTS.map(([x, y, z], index) => (
          <mesh key={`spot-${index}`} position={[x, y, z]} scale={[1, 0.42, 1]}>
            <sphereGeometry args={[0.055, 10, 7]} />
            <meshStandardMaterial color="#f5f3ff" emissive="#ede9fe" emissiveIntensity={0.26} />
          </mesh>
        ))}
      </group>
    );
  }

  if (item.model === "bench") {
    return (
      <group>
        {[-0.18, 0, 0.18].map((z, index) => (
          <mesh key={`seat-slat-${index}`} position={[0, 0.39, z - 0.08]} scale={[0.92, 0.065, 0.075]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#9a5f38" roughness={0.86} />
          </mesh>
        ))}
        {[0.53, 0.73].map((y, index) => (
          <mesh key={`back-slat-${index}`} position={[0, y, 0.25]} scale={[0.92, 0.07, 0.065]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={index === 0 ? "#a9683d" : "#b57545"} roughness={0.84} />
          </mesh>
        ))}
        {[-0.68, 0.68].map((x, index) => (
          <group key={`bench-side-${index}`}>
            <mesh position={[x, 0.21, -0.05]} scale={[0.09, 0.42, 0.09]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#475569" metalness={0.25} roughness={0.72} />
            </mesh>
            <mesh position={[x, 0.48, 0.18]} scale={[0.09, 0.58, 0.09]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#475569" metalness={0.25} roughness={0.72} />
            </mesh>
            <mesh position={[x, 0.56, -0.03]} scale={[0.12, 0.055, 0.44]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#64748b" metalness={0.22} roughness={0.7} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (item.model === "lantern") {
    return (
      <group>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.2, 0.24, 0.12, 12]} />
          <meshStandardMaterial color="#1f2937" metalness={0.46} roughness={0.58} />
        </mesh>
        <mesh position={[0, 0.52, 0]}>
          <cylinderGeometry args={[0.045, 0.065, 0.88, 10]} />
          <meshStandardMaterial color="#334155" metalness={0.42} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.92, 0]}>
          <boxGeometry args={[0.34, 0.08, 0.34]} />
          <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.62} />
        </mesh>
        <mesh position={[0, 1.12, 0]}>
          <boxGeometry args={[0.3, 0.34, 0.3]} />
          <meshStandardMaterial color="#fef3c7" emissive="#f59e0b" emissiveIntensity={0.82} transparent opacity={0.76} />
        </mesh>
        {[-0.18, 0.18].flatMap((x) =>
          [-0.18, 0.18].map((z) => (
            <mesh key={`lantern-frame-${x}-${z}`} position={[x, 1.12, z]} scale={[0.035, 0.42, 0.035]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.55} />
            </mesh>
          ))
        )}
        <mesh position={[0, 1.36, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.34, 0.2, 4]} />
          <meshStandardMaterial color="#1e293b" metalness={0.42} roughness={0.6} />
        </mesh>
        <pointLight position={[0, 1.14, 0]} color="#fbbf24" intensity={0.65} distance={3} />
      </group>
    );
  }

  if (item.model === "tree") {
    return (
      <group>
        <mesh position={[0, 0.68, 0]}>
          <cylinderGeometry args={[0.13, 0.24, 1.36, 11]} />
          <meshStandardMaterial color="#714327" roughness={0.98} />
        </mesh>
        <mesh position={[0.18, 1.08, 0]} rotation={[0, 0, -0.72]}>
          <cylinderGeometry args={[0.055, 0.09, 0.68, 8]} />
          <meshStandardMaterial color="#7c4a2d" roughness={0.98} />
        </mesh>
        <mesh position={[-0.18, 1.17, -0.02]} rotation={[0.12, 0, 0.78]}>
          <cylinderGeometry args={[0.05, 0.085, 0.62, 8]} />
          <meshStandardMaterial color="#7c4a2d" roughness={0.98} />
        </mesh>
        <mesh position={[-0.28, 1.47, 0.02]} scale={[1.1, 0.92, 1]}>
          <sphereGeometry args={[0.56, 13, 10]} />
          <meshStandardMaterial color="#24784a" roughness={1} />
        </mesh>
        <mesh position={[0.3, 1.49, 0.1]} scale={[1.02, 0.88, 0.96]}>
          <sphereGeometry args={[0.58, 13, 10]} />
          <meshStandardMaterial color="#319c5e" roughness={1} />
        </mesh>
        <mesh position={[0.02, 1.78, -0.08]} scale={[1.05, 0.9, 1]}>
          <sphereGeometry args={[0.5, 13, 10]} />
          <meshStandardMaterial color="#3fbd72" roughness={0.98} />
        </mesh>
        <mesh position={[0.04, 1.39, -0.42]} scale={[0.82, 0.78, 0.84]}>
          <sphereGeometry args={[0.47, 12, 9]} />
          <meshStandardMaterial color="#2c8c55" roughness={1} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.88, 0.98, 0.2, 24]} />
        <meshStandardMaterial color="#64748b" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
        <torusGeometry args={[0.7, 0.11, 10, 28]} />
        <meshStandardMaterial color="#aeb8c7" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.61, 28]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.22} transparent opacity={0.88} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 0.58, 12]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.76} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 0.12, 20]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.79, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.37, 20]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#0ea5e9" emissiveIntensity={0.28} transparent opacity={0.82} side={THREE.DoubleSide} />
      </mesh>
      <AnimatedFountainRipples />
      <mesh position={[0, 1.02, 0]}>
        <sphereGeometry args={[0.1, 12, 9]} />
        <meshStandardMaterial color="#e0f2fe" emissive="#38bdf8" emissiveIntensity={0.52} />
      </mesh>
      <pointLight position={[0, 0.78, 0]} color="#7dd3fc" intensity={0.34} distance={2.4} />
    </group>
  );
}


function DecorationTapTarget({
  item,
}: {
  item: IslandDecorationCatalogItem;
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
    useRef(
      new THREE.Vector3()
    ).current;

  const worldScale =
    useRef(
      new THREE.Vector3()
    ).current;

  // NOVA_EASIER_DECORATION_SELECTION_V1
  const treeLike =
    item.model === "tree" ||
    item.model === "alien_tree" ||
    item.model === "cherry_tree" ||
    item.model === "pine_tree" ||
    item.model === "palm_tree" ||
    item.model === "telescope" ||
    item.model === "star_lantern" ||
    item.model === "portal";

  const wideLike =
    item.model === "rainbow" ||
    item.model === "ufo" ||
    item.model === "cosmic_arch" ||
    item.model === "fence" ||
    item.model === "pond" ||
    item.model === "flower_bed";

  const floatingLike =
    item.model === "tiny_planet" ||
    item.model === "floating_rock" ||
    item.model === "ufo";

  const pixels =
    treeLike
      ? 138
      : wideLike
      ? 132
      : floatingLike
      ? 128
      : item.model === "bench"
      ? 116
      : item.model === "fountain"
      ? 118
      : item.model === "crystal"
      ? 108
      : item.model === "meteor"
      ? 112
      : item.model === "moon_rock"
      ? 108
      : item.model === "alien_mushroom"
      ? 112
      : item.model === "grass_patch"
      ? 104
      : item.model === "lantern"
      ? 108
      : 104;

  const y =
    treeLike
      ? 1.28
      : item.model === "cosmic_arch"
      ? 1.15
      : item.model === "rainbow"
      ? 1.0
      : item.model === "tiny_planet"
      ? 0.9
      : item.model === "floating_rock"
      ? 0.82
      : item.model === "ufo"
      ? 0.78
      : item.model === "star_lantern"
      ? 1.05
      : item.model === "lantern"
      ? 0.88
      : item.model === "bench"
      ? 0.62
      : item.model === "fountain"
      ? 0.7
      : item.model === "pond"
      ? 0.34
      : item.model === "fence"
      ? 0.62
      : item.model === "crystal"
      ? 0.66
      : 0.56;

  const minWorld =
    treeLike
      ? 1.7
      : wideLike
      ? 1.65
      : floatingLike
      ? 1.55
      : item.model === "bench"
      ? 1.4
      : item.model === "fountain"
      ? 1.45
      : item.model === "crystal"
      ? 1.3
      : 1.25;

  const maxWorld =
    treeLike
      ? 9.0
      : wideLike
      ? 8.6
      : floatingLike
      ? 8.2
      : item.model === "bench"
      ? 7.2
      : item.model === "fountain"
      ? 7.4
      : 6.8;

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

export default function IslandDecorationLayer({
  onSelectDecoration,
  onInspectDecoration,
  inspectedPlacementId = null,
}: {
  onSelectDecoration?: () => void;
  onInspectDecoration?: (
    placementId: string
  ) => void;
  inspectedPlacementId?: string | null;
}) {
  const { isEditing } = useIslandBuilder();
  const keepsakes = useIslandKeepsakes();
  const {
    placements,
    selectedPlacementId,
    selectPlacement,
    armDecorationDrag,
  } = useIslandDecorations();

  return (
    <group>
      {placements.map((placement) => {
        const item = ISLAND_DECORATION_CATALOG_BY_ID[placement.itemId];
        if (!item) return null;
        const selected =
          selectedPlacementId ===
          placement.placementId;

        const inspected =
          !isEditing &&
          inspectedPlacementId ===
            placement.placementId;

        return (
          <group
            key={placement.placementId}
            position={[placement.transform.x, 0.72, placement.transform.z]}
            rotation={[0, placement.transform.rotationY, 0]}
            scale={placement.transform.scale}
            onPointerDown={(event) => {
              if (isEditing && selected) {
                event.stopPropagation();
                armDecorationDrag(placement.placementId);
              }
            }}
            onClick={(event) => {
              event.stopPropagation();

              if (!isEditing) {
                onInspectDecoration?.(
                  placement.placementId
                );
                return;
              }

              onSelectDecoration?.();
              keepsakes.selectKeepsake(null);
              selectPlacement(
                placement.placementId
              );
            }}
          >
            {selected || inspected ? (
              <mesh
                position={[0, 0.03, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <ringGeometry
                  args={[0.72, 0.86, 36]}
                />
                <meshBasicMaterial
                  color={
                    inspected
                      ? item.accent
                      : "#67e8f9"
                  }
                  transparent
                  opacity={0.82}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ) : null}

            <DecorationTapTarget
              item={item}
            />
            <Model item={item} />
          </group>
        );
      })}
    </group>
  );
}
