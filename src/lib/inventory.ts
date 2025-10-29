import AsyncStorage from "@react-native-async-storage/async-storage";

const K_BASE = "inv:";
const K_IDX = "inv:idx:";

function keyFor(id: string, opts?: Record<string, string> | null) {
  if (opts && opts.size) return `${K_BASE}${id}::size:${opts.size}`;
  if (opts && opts.model) return `${K_BASE}${id}::model:${opts.model}`;
  return `${K_BASE}${id}`;
}
function idxKey(id: string) {
  return `${K_IDX}${id}`;
}

async function readNum(k: string, def = 0) {
  try {
    const v = await AsyncStorage.getItem(k);
    const n = v == null ? NaN : parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
  } catch {
    return def;
  }
}
async function writeNum(k: string, n: number) {
  try {
    await AsyncStorage.setItem(k, String(Math.max(0, Math.trunc(n))));
  } catch {}
}
async function addIndex(id: string, vkey: string) {
  try {
    const raw = await AsyncStorage.getItem(idxKey(id));
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    if (!arr.includes(vkey)) {
      arr.push(vkey);
      await AsyncStorage.setItem(idxKey(id), JSON.stringify(arr));
    }
  } catch {}
}

export async function getStock(
  id: string,
  def = 0,
  opts?: Record<string, string>,
) {
  return readNum(keyFor(id, opts), def);
}
export async function setStock(
  id: string,
  qty: number,
  opts?: Record<string, string>,
) {
  const k = keyFor(id, opts);
  await writeNum(k, qty);
  if (opts && (opts.size || opts.model)) await addIndex(id, k);
  return qty;
}
export async function adjustStock(
  id: string,
  delta: number,
  opts?: Record<string, string>,
) {
  const k = keyFor(id, opts);
  const cur = await readNum(k, 0);
  const next = Math.max(0, cur + Math.trunc(delta));
  await writeNum(k, next);
  if (opts && (opts.size || opts.model)) await addIndex(id, k);
  return next;
}

export type StockMap = Record<string, number>;

export async function listStock(ids: string[]): Promise<StockMap> {
  const out: StockMap = {};
  for (const id of ids) {
    try {
      const raw = await AsyncStorage.getItem(idxKey(id));
      if (raw) {
        const keys: string[] = JSON.parse(raw) || [];
        let sum = 0;
        for (const k of keys) sum += await readNum(k, 0);
        out[id] = sum;
      } else {
        out[id] = await readNum(keyFor(id), 0);
      }
    } catch {
      out[id] = 0;
    }
  }
  return out;
}

export async function listVariantStock(
  id: string,
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    const raw = await AsyncStorage.getItem(idxKey(id));
    if (!raw) {
      out["_total"] = await readNum(keyFor(id), 0);
      return out;
    }
    const keys: string[] = JSON.parse(raw) || [];
    for (const k of keys) {
      const n = await readNum(k, 0);
      // parse suffix "::size:XL" or "::model:iPhone 15"
      const mSize = k.match(/::size:(.+)$/);
      const mModel = k.match(/::model:(.+)$/);
      const label = mSize?.[1] ?? mModel?.[1] ?? k.replace(/^.+::/, "");
      out[label] = n;
    }
  } catch {}
  return out;
}
