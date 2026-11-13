import { SHOP_ITEMS } from "@/constants/payments";
export async function isIAPAvailable(){ return true; }
export async function getProducts(){ return SHOP_ITEMS; }
export async function buyProduct(_id:string){ return { ok:true }; }
