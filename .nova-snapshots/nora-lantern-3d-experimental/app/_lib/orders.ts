export type Order = { id:string; pkg:string; amount:number; createdAt:string };
export async function addOrder(o: Order){ return o; }
export async function getOrdersSummary(){ return { totalOrders:0, totalRevenueUSD:0 }; }
export default { addOrder, getOrdersSummary };
