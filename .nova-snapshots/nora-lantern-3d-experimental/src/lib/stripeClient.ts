import { apiPost } from "./api";
export async function startCoinPackCheckout(_packId:string){ return { url:"" }; }
export async function createPaymentIntent(_amt:number){ const r = await apiPost("/pay", { amount: _amt }); return { clientSecret: "test_secret" }; }
