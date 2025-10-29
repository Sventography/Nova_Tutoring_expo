const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "app/tabs/shop.tsx");
if (!fs.existsSync(file)) {
  console.error("✖ app/tabs/shop.tsx not found");
  process.exit(1);
}
let src = fs.readFileSync(file, "utf8");
let changed = false;

// 1) ensure import exists only once
if (!src.includes('from "../lib/order"')) {
  const anchor = /import\s+AddressSheet\s+from\s+["']\.\.\/components\/AddressSheet["'];?/;
  if (anchor.test(src)) {
    src = src.replace(anchor, (m) => `${m}\nimport { placeOrderEmail } from "../lib/order";`);
  } else {
    src = `import { placeOrderEmail } from "../lib/order";\n` + src;
  }
  changed = true;
}
// dedupe duplicates
src = src.replace(/(?:\r?\n)+import\s+\{\s*placeOrderEmail\s*\}\s+from\s+["']\.\.\/lib\/order["'];?/g, (match, offset, whole) => {
  // keep only the first one
  const head = whole.slice(0, offset);
  if (head.includes('from "../lib/order"')) return "";
  return match;
});

// 2) replace applyBuyWithCoins body
{
  const re = /const\s+applyBuyWithCoins\s*=\s*async?\s*\(\s*it\s*:\s*Item\s*\)\s*=>\s*\{[\s\S]*?\n\};/;
  if (re.test(src)) {
    src = src.replace(re, `const applyBuyWithCoins = async (it: Item) => {
  if (it.category === "coins") return; // coin bundles are cash-only

  // deduct coins locally (validation happens in your confirm modal)
  spendCoins(it.coinPrice);

  // in-app effect
  if (it.type === "virtual") {
    Alert.alert("Equipped!", \`\${it.name} is now active ✨\`);
  } else {
    setPending(it); // tangible: collect shipping address
  }

  // email you (coins)
  try {
    await placeOrderEmail({
      item: { id: it.id, name: it.name, coinPrice: it.coinPrice, method: "coins" },
    });
  } catch (e) {
    console.warn("placeOrderEmail(coins) failed:", e);
  }
};`);
    changed = true;
  }
}

// 3) replace buyWithCash body
{
  const re = /const\s+buyWithCash\s*=\s*async?\s*\(\s*it\s*:\s*Item\s*\)\s*=>\s*\{[\s\S]*?\n\};/;
  if (re.test(src)) {
    src = src.replace(re, `const buyWithCash = async (it: Item) => {
  if (!it) return;

  if (it.type === "tangible") {
    setPending(it); // open AddressSheet, email on confirm
    return;
  }

  // virtual
  try {
    Alert.alert("Purchased!", \`\${it.name} purchased for $\${it.cashPrice.toFixed(2)}.\`);
    await placeOrderEmail({
      item: { id: it.id, name: it.name, cashPrice: it.cashPrice, method: "cash" },
    });
  } catch (e) {
    console.warn("placeOrderEmail(cash) failed:", e);
    Alert.alert("Order failed", "Please try again.");
  }
};`);
    changed = true;
  }
}

// 4) patch AddressSheet onConfirm body
{
  const re = /(onConfirm=\{\s*async?\s*\(\s*addr\s*\)\s*=>\s*\{)[\s\S]*?(\}\s*\})/;
  if (re.test(src)) {
    src = src.replace(re, `$1
  const it = pending!;
  setPending(null);
  try {
    await placeOrderEmail({
      item: { id: it.id, name: it.name, cashPrice: it.cashPrice, method: "cash" },
      address: {
        name: addr?.name ?? "",
        address1: addr?.address1 ?? addr?.address ?? "",
        address2: addr?.address2 ?? "",
        city: addr?.city ?? "",
        state: addr?.state ?? "",
        zip: addr?.zip ?? addr?.postalCode ?? "",
        country: addr?.country ?? ""
      }
    });
    Alert.alert("Order placed", \`We’ll ship your \${it.name} soon 💫\`);
  } catch (e) {
    Alert.alert("Order failed", "Please try again.");
    console.warn("placeOrderEmail(tangible) failed:", e);
  }
$2`);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(file, src, "utf8");
  console.log("✅ Patched app/tabs/shop.tsx");
} else {
  console.log("ℹ️ No changes applied (patterns not found).");
}
