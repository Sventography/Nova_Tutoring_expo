export type Mission={ id:string; title:string; desc?:string; progress:number; target:number; rewardCoins:number; period:"daily"|"weekly"; claimed?:boolean };
export type MissionsState={ daily:Mission[]; weekly:Mission[] };
export async function claimMission(_id:string){ return { ok:true }; }
export default {} as any;
