// Nora's Last Lantern: standalone, low-poly island decoration.
// Not yet registered in the decoration catalog or available to players.
import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber/native";
import * as THREE from "three";

type Props = { fireworksTrigger?: number };
const GOLD = "#fbbf24";
const STONE = "#4c3a72";
const CYAN = "#67e8f9";
const PURPLE = "#c4b5fd";
const FIREWORK_COLORS = [GOLD, CYAN, PURPLE];
const BURST_DURATION = 7.5;
const AMBER = "#ffe4a3";
const DEEP = "#211a3d";

function Tower({ x, height, radius = 0.44 }: { x: number; height: number; radius?: number }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius * 0.88, radius, height, 8]} />
        <meshStandardMaterial color={STONE} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[radius * 1.22, radius * 1.3, 0.32, 10]} />
        <meshStandardMaterial color={DEEP} roughness={0.72} />
      </mesh>
      <mesh position={[0, height + 0.26, 0]}>
        <coneGeometry args={[radius * 1.35, 0.7, 8]} />
        <meshStandardMaterial color={GOLD} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, height + 0.69, 0]}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshBasicMaterial color={AMBER} />
      </mesh>
      <mesh position={[0, height + 0.12, 0]}>
        <torusGeometry args={[radius * 1.08, 0.065, 5, 16]} />
        <meshStandardMaterial color={GOLD} metalness={0.65} roughness={0.25} />
      </mesh>
      {[0.5, 1.15, 1.8].filter(y => y < height - 0.2).map((y) => (
        <mesh key={y} position={[0, y, radius * 0.88 + 0.01]}>
          <boxGeometry args={[0.2, 0.3, 0.04]} />
          <meshBasicMaterial color={CYAN} />
        </mesh>
      ))}
      <mesh position={[0, height * 0.52, -radius * 0.88 - 0.02]}>
        <boxGeometry args={[radius * 0.46, 0.48, 0.055]} />
        <meshBasicMaterial color={AMBER} />
      </mesh>
      <mesh position={[0, height - 0.08, 0]}>
        <torusGeometry args={[radius * 0.95, 0.045, 5, 16]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.22} />
      </mesh>
    </group>
  );
}

function Fireworks({ trigger = 0 }: { trigger: number }) {
  const group = useRef<THREE.Group>(null);
  const startedAt = useRef(-1000);
  const previousTrigger = useRef(trigger);
  const particles = useMemo(() =>
    Array.from({ length: 36 }, (_, i) => {
      const angle = (i % 12) * Math.PI / 6;
      const ring = Math.floor(i / 12);
      return {
        x: Math.cos(angle),
        z: Math.sin(angle),
        y: Math.sin(angle * 2 + ring),
        centerX: [-1.9, 0, 1.9][ring],
        centerY: [4.5, 5.3, 4.5][ring],
        color: FIREWORK_COLORS[ring],
        delay: ring * 0.65,
      };
    }), []);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (previousTrigger.current !== trigger) {
      previousTrigger.current = trigger;
      startedAt.current = time;
    }
    const elapsed = time - startedAt.current;
    if (!group.current) return;
    group.current.children.forEach((child, index) => {
      const particle = particles[index];
      const t = elapsed - particle.delay;
      const active = t >= 0 && t < 1.5 && elapsed < BURST_DURATION;
      child.visible = active;
      if (!active) return;
      const spread = 0.12 + t * 1.2;
      child.position.set(
        particle.centerX + particle.x * spread,
        particle.centerY + particle.y * spread - t * t * 0.18,
        particle.z * spread
      );
      child.scale.setScalar(Math.max(0.04, 0.16 * (1 - t / 1.5)));
    });
  });
  return (
    <group ref={group}>
      {particles.map((p, i) => (
        <mesh key={i} visible={false}>
          <sphereGeometry args={[1, 5, 4]} />
          <meshBasicMaterial color={p.color} transparent opacity={0.92} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** The golden pathway and gate are visual only: no extra physics or draw-loop work. */
function RoyalApproach() {
  return (
    <group>
      <mesh position={[0, 0.11, 2.62]}>
        <boxGeometry args={[1.9, 0.13, 2.9]} />
        <meshStandardMaterial color="#46365f" roughness={0.84} />
      </mesh>
      {[-0.68, 0.68].map(x => (
        <group key={x}>
          <mesh position={[x, 0.2, 2.63]}>
            <boxGeometry args={[0.09, 0.06, 2.85]} />
            <meshStandardMaterial color={GOLD} metalness={0.52} roughness={0.36} />
          </mesh>
          {[1.58, 2.7, 3.7].map(z => (
            <group key={z} position={[x * 1.42, 0, z]}>
              <mesh position={[0, 0.37, 0]}>
                <cylinderGeometry args={[0.12, 0.17, 0.74, 6]} />
                <meshStandardMaterial color={STONE} />
              </mesh>
              <mesh position={[0, 0.84, 0]}>
                <octahedronGeometry args={[0.19, 0]} />
                <meshBasicMaterial color={AMBER} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.86, 1.26]}>
        <boxGeometry args={[1.35, 1.62, 0.12]} />
        <meshStandardMaterial color={DEEP} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.73, 1.28]}>
        <torusGeometry args={[0.67, 0.09, 7, 18, Math.PI]} />
        <meshStandardMaterial color={GOLD} metalness={0.62} roughness={0.28} />
      </mesh>
      <mesh position={[0, 1.13, 1.34]}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshBasicMaterial color={CYAN} />
      </mesh>
    </group>
  );
}

/** One-of-one reward silhouette: broad foundation, amber lantern and gold crowns. */
export default function NorasLastLantern({ fireworksTrigger = 0 }: Props) {
  const glow = useRef<THREE.Mesh>(null);
  const crown = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (crown.current) crown.current.rotation.y = time * 0.16;
    if (!glow.current) return;
    const material = glow.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.64 + 0.12 * Math.sin(time * 1.4);
  });
  return (
    <group>
      <RoyalApproach />
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[2.8, 3.05, 0.36, 12]} />
        <meshStandardMaterial color="#30294f" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[2.5, 2.65, 0.18, 12]} />
        <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.35} />
      </mesh>
      {[-2.05, 2.05].map(x => <Tower key={x} x={x} height={3.55} />)}
      {[-1.15, 1.15].map(x => <Tower key={x} x={x} height={2.1} radius={0.32} />)}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[1.15, 1.35, 2.15, 10]} />
        <meshStandardMaterial color={STONE} roughness={0.62} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[1.28, 1.05, 0.23, 10]} />
        <meshStandardMaterial color={GOLD} metalness={0.55} roughness={0.28} />
      </mesh>
      <mesh ref={glow} position={[0, 3.35, 0]}>
        <sphereGeometry args={[0.9, 16, 12]} />
        <meshBasicMaterial color="#ffe8a3" transparent opacity={0.72} depthWrite={false} />
      </mesh>
      <mesh position={[0, 3.35, 0]}>
        <sphereGeometry args={[0.96, 16, 12]} />
        <meshStandardMaterial color="#fef3c7" transparent opacity={0.3} emissive={GOLD} emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0, 4.33, 0]}>
        <coneGeometry args={[1.08, 0.65, 10]} />
        <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.28} />
      </mesh>
      <group ref={crown} position={[0, 3.35, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.33, 0.035, 5, 32]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.76} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => {
          const a = i * Math.PI / 4;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.33, 0, Math.sin(a) * 1.33]}>
              <octahedronGeometry args={[0.11, 0]} />
              <meshBasicMaterial color={i % 2 ? GOLD : CYAN} />
            </mesh>
          );
        })}
      </group>
      <mesh position={[0, 4.82, 0]}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshBasicMaterial color={CYAN} />
      </mesh>
      {[-0.85, 0.85].map(x => (
        <mesh key={x} position={[x, 0.95, 1.05]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[0.26, 1.2, 0.08]} />
          <meshBasicMaterial color="#7dd3fc" transparent opacity={0.8} />
        </mesh>
      ))}
      <Fireworks trigger={fireworksTrigger} />
    </group>
  );
}
