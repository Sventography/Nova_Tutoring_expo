// Circular orbits about a fixed central mass, normalized to Earth's orbital radius and period.
export const ORBIT_RADII = [0.5, 1, 1.5, 2] as const;
export const ORBIT_STEPS = 12;
export function orbitAt(radius: number, step: number) {
  if (!ORBIT_RADII.some(r => r === radius)) throw new RangeError("Invalid orbit radius");
  if (!Number.isInteger(step) || step < 0 || step > ORBIT_STEPS) throw new RangeError("Invalid time step");
  const period = Math.pow(radius, 1.5);
  const elapsed = step / ORBIT_STEPS;
  const turns = elapsed / period;
  const angle = turns * 2 * Math.PI;
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);
  return {radius, period, elapsed, turns, angle, x, y, speed: 1 / Math.sqrt(radius),
    tangentX: -Math.sin(angle), tangentY: Math.cos(angle),
    inwardX: -Math.cos(angle), inwardY: -Math.sin(angle)};
}
