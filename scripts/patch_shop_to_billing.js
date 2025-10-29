const fs = require("fs");
const p = "app/tabs/shop.tsx";
let s = fs.readFileSync(p, "utf8");

// insert router = useRouter() if not present inside Shop()
s = s.replace(
  /(export default function Shop\(\)\s*\{\s*)(?![\s\S]*useRouter\(\))/,
  `$1const router = useRouter();\n  `
);

// swap onConfirm body
s = s.replace(
  /(onConfirm=\{\s*async?\s*\(\s*addr\s*\)\s*=>\s*\{)[\s\S]*?(\}\s*\})/,
  `$1
    const it = pending!;
    // Build draft and move to billing
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

fs.writeFileSync(p, s, "utf8");
console.log("✅ shop.tsx wired to /billing");
