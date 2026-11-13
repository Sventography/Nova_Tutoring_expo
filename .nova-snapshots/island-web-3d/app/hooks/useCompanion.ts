import { emitCompanion } from "../companions/CompanionEvents";

export function useCompanion() {
  return {
    celebrate: () => emitCompanion("celebrate"),
    coin: () => emitCompanion("coin"),
    comfort: () => emitCompanion("comfort"),
  };
}
