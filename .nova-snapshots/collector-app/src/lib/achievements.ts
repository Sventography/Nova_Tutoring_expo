export type Achievement={ id:string; name:string; unlocked?:boolean };
export async function listAll():Promise<Achievement[]>{ return [{ id:"a1", name:"Starter", unlocked:true }]; }
export async function getPoints():Promise<number>{ return 0; }
export async function awardOnQuizComplete(..._a:any[]){ return; }
