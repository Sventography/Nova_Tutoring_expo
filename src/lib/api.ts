export async function api(path:string, opts?: RequestInit){ return fetch(path, opts); }
export async function apiPost(path:string, body:any){ return fetch(path, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) }); }
export async function apiGet(path:string){ return fetch(path); }
