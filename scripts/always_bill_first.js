const fs = require("fs");
const path = require("path");
const p = path.join(process.cwd(), "app/tabs/shop.tsx");
let s = fs.readFileSync(p, "utf8");
let changed = false;

// Ensure imports
if (!s.includes('from "../lib/checkout"')) {
  s = s.replace(/(import\s+AddressSheet[\s\S]*?;)/, `$1\nimport { setCheckoutDraft } from "../lib/checkout";`);
  changed = true;
}
if (!s.includes('useRouter')) {
  s = s.replace(/(import\s+{[^}]*?} from "react-native";?)/, `$1\nimport { useRouter } from "expo-router";`);
  changed = true;
}
if (!/const\s+router\s*=\s*useRouter\(\)/.test(s)) {
  s = s.replace(/(export\s+default\s+function\s+Shop\s*\(\)\s*\{\s*)/, `$1const router = useRouter();\n  `);
  changed = true;
}

// Rewrite buyWithCash to always go to /billing (virtual immediately; tangible via AddressSheet)
s = s.replace(
  /const\s+buyWithCash\s*=\s*async?\s*\(\s*it\s*:\s*Item\s*\)\s*=>\s*\{[\s\S]*?\n\};/,
  `const buyWithCash = async (it: Item) => {
  if (!it) return;

  if (it.type === "tangible") {
    // collect shipping in AddressSheet; onConfirm will set draft + navigate
    setPending(it);
    return;
  }

  // virtual — build draft (no shipping) and go to billing
  setCheckoutDraft({
    item: { id: it.id, name: it.name, cashPrice: it.cashPrice, type: "virtual" },
  });
  router.push("/billing");
};`
);
changed = true;

// Ensure AddressSheet onConfirm builds draft with shipping and navigates
s = s.replace(
  /(onConfirm=\{\s*async?\s*\(\s*addr\s*\)\s*=>\s*\{)[\s\S]*?(\}\s*\})/,
  `$1
    const it = pending!;
    setCheckoutDraft({
      item: { id: it.id, name: it.name, cashPrice: it.cashPrice, type: "tangible" },
      shipping: {
        name: addr?.name ?? "",
        email: addr?.email ?? "",
        phone: addr?.phone ?? "",
        address1: addr?.address1 ?? addr?.address ?? "",
        address2: addr?.address2 ?? "",
        city: addr?.city ?? "",
        state: addr?.state ?? "",
        zip: addr?.zip ?? addr?.postalCode ?? "",
        country: addr?.country ?? ""
      }
    });
    setPending(null);
    router.push("/billing");
  $2`
);
changed = true;

if (changed) {
  fs.writeFileSync(p, s, "utf8");
  console.log("✅ shop.tsx now sends ALL cash purchases to /billing");
} else {
  console.log("ℹ️ No changes applied.");
}
