import fs from "fs";
import path from "path";

const tabsDir = path.join("app", "(tabs)");
const quarantine = path.join("app", "_disabled_tabs_dupes");
fs.mkdirSync(quarantine, { recursive: true });

if (!fs.existsSync(tabsDir)) {
  console.error("❌ Missing directory:", tabsDir);
  process.exit(1);
}

// Gather candidates from direct children of app/(tabs)
const entries = fs.readdirSync(tabsDir, { withFileTypes: true });
const segInfo = new Map(); // name -> { file?:string, dir?:string }

function addSeg(name, kind, p) {
  if (!segInfo.has(name)) segInfo.set(name, {});
  segInfo.get(name)[kind] = p;
}

for (const e of entries) {
  const p = path.join(tabsDir, e.name);
  if (e.isFile()) {
    const m = /^([A-Za-z0-9_-]+)\.(tsx|ts|jsx|js)$/.exec(e.name);
    if (m) addSeg(m[1], "file", p);
  } else if (e.isDirectory()) {
    const ix = ["index.tsx","index.ts","index.jsx","index.js"].find(f => fs.existsSync(path.join(p,f)));
    if (ix) addSeg(e.name, "dir", path.join(p, ix));
  }
}

// Resolve duplicates: prefer single-file segment over folder/index form
for (const [name, info] of segInfo.entries()) {
  if (info.file && info.dir) {
    const dirPath = path.dirname(info.dir);
    const dst = path.join(quarantine, `${name}__folder_backup`);
    if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
    fs.renameSync(dirPath, dst);
    console.log("🟡 Moved duplicate folder for", name, "→", dst);
    delete info.dir;
  }
}

// Final segment list
const segments = Array.from(segInfo.keys()).sort();

// Pick an initial that actually exists (prefer "ask", else "account", else first)
let initial = segments.includes("ask") ? "ask"
            : segments.includes("account") ? "account"
            : (segments[0] || "account");

// Build _layout.tsx with clean names (no .tsx)
function titleCase(s) {
  return s.replace(/[-_]/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase());
}

const layout = `import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs initialRouteName="${initial}" screenOptions={{ headerShown: false }}>
${segments.map(s => `      <Tabs.Screen name="${s}" options={{ title: "${titleCase(s)}" }} />`).join("\n")}
    </Tabs>
  );
}
`;

fs.writeFileSync(path.join(tabsDir, "_layout.tsx"), layout);
console.log("✅ Wrote clean Tabs layout with screens:", segments.join(", ") || "(none)");
console.log("✅ initialRouteName:", initial);
