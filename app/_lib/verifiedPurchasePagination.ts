// Read complete verified inventories using keyset pagination. The API may
// impose a smaller limit than the requested page size, so only an empty
// page terminates a successful read. Never publish a partial collection.
export type VerifiedPurchaseRow = { item_id: string; source: string };
const PAGE_SIZE = 200;
const MAX_PAGES = 100;

export async function readAllVerifiedPurchases(
  fetchPage: (after: string | null, limit: number) => Promise<unknown>,
  isCurrent: () => boolean
): Promise<VerifiedPurchaseRow[]> {
  const rows: VerifiedPurchaseRow[] = [];
  const seen = new Set<string>();
  let after: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    if (!isCurrent()) throw new Error("Purchase account changed");
    const batch = await fetchPage(after, PAGE_SIZE);
    if (!isCurrent()) throw new Error("Purchase account changed");
    if (!Array.isArray(batch) || batch.length > PAGE_SIZE) throw new Error("Invalid ownership page");
    if (batch.length === 0) return rows;
    for (const row of batch) {
      if (!row || typeof row.item_id !== "string" ||
          !row.item_id.trim() || row.item_id.length > 160 ||
          !["coins", "verified_iap", "verified_reward"].includes(row.source) ||
          seen.has(row.item_id)) throw new Error("Invalid or repeated ownership record");
      seen.add(row.item_id);
      rows.push({ item_id: row.item_id, source: row.source });
    }
    after = rows[rows.length - 1].item_id;
  }
  throw new Error("Ownership page limit exceeded; retry or reconcile");
}
