import { create } from "zustand";

type WalletState = {
  coins: number;
  pending: boolean;
  setCoins: (n: number) => void;
  addCoins: (n: number) => void;
  spendLocal: (n: number) => void;
  setPending: (p: boolean) => void;
};

export const useWallet = create<WalletState>((set, get) => ({
  coins: 0,
  pending: false,
  setCoins: (n) => set({ coins: Math.max(0, Math.floor(n)) }),
  addCoins: (n) => set({ coins: Math.max(0, Math.floor(get().coins + n)) }),
  spendLocal: (n) => set({ coins: Math.max(0, Math.floor(get().coins - n)) }),
  setPending: (p) => set({ pending: p }),
}));
