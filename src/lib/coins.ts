import { api } from "./api";
export async function getBalance(user = "default") {
  return api.coins.balance(user);
}
export async function addCoins(
  amount: number,
  reason: string,
  user = "default",
) {
  return api.coins.add(user, amount, reason);
}
