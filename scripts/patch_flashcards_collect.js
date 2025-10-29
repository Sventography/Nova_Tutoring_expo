const fs = require("fs");
const path = require("path");
const p = path.join(process.cwd(), "app/flashcards.tsx");
if (!fs.existsSync(p)) {
  console.error("✖ app/flashcards.tsx not found");
  process.exit(1);
}
let s = fs.readFileSync(p, "utf8");
let changed = false;

// 1) Ensure imports (top of file)
if (!s.includes('from "./components/CollectButton"')) {
  s = s.replace(
    /(import[\s\S]*?from\s+"react-native";?\s*\n)/,
    `$1import CollectButton from "./components/CollectButton";\nimport type { SavedCard } from "./lib/collections";\n`
  );
  changed = true;
}

// 2) Inject <CollectButton .../> inside the flashcard UI container
// Target our earlier markup: <View style={s.card}> (top of the card)
if (!s.includes("<CollectButton") && s.includes("<View style={s.card}>")) {
  s = s.replace(
    /(<View style=\{s\.card\}>\s*\n\s*<TouchableOpacity[\s\S]*?<Text style=\{s\.small\}>\{\i \+ 1\} \/ \{cards\.length\}<\/Text>\s*\n\s*<\/TouchableOpacity>\s*\n)/,
    `$1
        {/* save to collection */}
        <CollectButton
          card={{
            id: \`\${topic?.id ?? "topic"}::\${card.q}\`,
            topicId: String(topic?.id ?? ""),
            topicTitle: String(topic?.title ?? ""),
            q: String(card.q ?? ""),
            a: String(card.a ?? "")
          } as SavedCard}
        />
`
  );
  changed = true;
}

// Fallback: if the exact pattern didn't match, add the button just after <View style={s.card}>
if (!s.includes("<CollectButton") && s.includes("<View style={s.card}>")) {
  s = s.replace(
    /(<View style=\{s\.card\}>\s*\n)/,
    `$1        <CollectButton card={{ id: \`\${topic?.id ?? "topic"}::\${(card as any)?.q}\`, topicId: String(topic?.id ?? ""), topicTitle: String(topic?.title ?? ""), q: String((card as any)?.q ?? ""), a: String((card as any)?.a ?? "") } as SavedCard} />\n`
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(p, s, "utf8");
  console.log("✅ flashcards.tsx updated with imports + CollectButton render");
} else {
  console.log("ℹ️ No changes made (imports/button may already be present).");
}
