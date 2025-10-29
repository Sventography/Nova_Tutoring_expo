export async function wikiSummary(q:string){
  const slug=encodeURIComponent(q.trim());
  const url=`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`;
  try{
    const r=await fetch(url,{headers:{'accept':'application/json'}});
    if(!r.ok) return null;
    const j=await r.json();
    if(j?.extract) return j.extract as string;
    return null;
  }catch{ return null; }
}
