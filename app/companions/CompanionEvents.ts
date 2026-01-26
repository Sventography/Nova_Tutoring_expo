export type CompanionReaction =
  | "celebrate"
  | "coin"
  | "comfort";

type Listener = (reaction: CompanionReaction) => void;

const listeners = new Set<Listener>();

export function emitCompanion(reaction: CompanionReaction) {
  listeners.forEach((l) => l(reaction));
}

export function onCompanion(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
