export type WikiDoc = { id: string; title: string; content: string };
export const wikiDocs: WikiDoc[] = [
  { id: "math_basics", title: "Math Basics", content: "Order of operations (PEMDAS), properties of equality, linear vs. quadratic." },
  { id: "bio_energy", title: "Cellular Energy", content: "Mitochondria are the powerhouse; ATP generated via cellular respiration." },
  { id: "civics_overview", title: "US Civics Overview", content: "Constitution, checks and balances, roles of branches." }
];
export function findWikiSnippets(query: string): WikiDoc[] {
  const q = query.toLowerCase();
  return wikiDocs.filter(d =>
    d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
  ).slice(0, 3);
}
