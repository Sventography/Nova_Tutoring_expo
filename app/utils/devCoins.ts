import { useCoins } from "../context/CoinsContext";

export function useDevCoins() {
  const { addCoins } = useCoins();

  return {
    add10k: () => addCoins(10_000),
    add50k: () => addCoins(50_000),
    add100k: () => addCoins(100_000),
  };
}
