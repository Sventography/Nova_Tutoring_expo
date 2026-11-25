import type { Discovery, Interest } from "./discoveryModel";

export type BrowseOptions = {
  query: string;
  subject: Interest | "all";
  savedOnly: boolean;
  saved: readonly string[];
  interests: readonly Interest[];
};

// Search only the curated public catalog; no personal text, history or AI calls.
export function browseDiscoveries(catalog: readonly Discovery[], options: BrowseOptions): Discovery[] {
  const words=options.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const saved=new Set(options.saved);
  const interests=new Set(options.interests);
  return catalog.filter(d=>{
    if(options.subject!=="all" && d.interest!==options.subject)return false;
    if(options.savedOnly && !saved.has(d.id))return false;
    const searchable=[d.title,d.hook,d.insight,d.activity].join(" ").toLowerCase();
    return words.every(word=>searchable.includes(word));
  }).map((d,index)=>({d,index})).sort((a,b)=>
    Number(interests.has(b.d.interest))-Number(interests.has(a.d.interest)) || a.index-b.index
  ).map(item=>item.d);
}
