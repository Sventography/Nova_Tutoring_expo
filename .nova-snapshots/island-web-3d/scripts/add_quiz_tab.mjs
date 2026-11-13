import fs from "fs";
import path from "path";

const p = "app/(tabs)/_layout.tsx";

const defaultLayout = `import React from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#79F3FF",
        tabBarInactiveTintColor: "#9FB6D0",
        tabBarStyle: { backgroundColor: "#0b0f14" }
      }}
    >
      <Tabs.Screen
        name="quiz"
        options={{
          title: "Quiz",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="help-circle-outline" color={color} size={size} />
          )
        }}
      />
    </Tabs>
  );
}
`;

function ensureImports(src) {
  let s = src;
  if (!/from\s+"expo-router"/.test(s)) {
    s = `import { Tabs } from "expo-router";\n` + s;
  } else if (!/import\s*\{\s*Tabs\s*\}\s*from\s*"expo-router"/.test(s)) {
    s = s.replace(/from\s+"expo-router";/, 'from "expo-router";');
    if (!/Tabs\s*\}/.test(s.split('from "expo-router"')[0])) {
      s = s.replace(/import\s*\{([^}]*)\}\s*from\s*"expo-router";/, (m, g1) => {
        const names = g1.split(",").map(x => x.trim()).filter(Boolean);
        if (!names.includes("Tabs")) names.push("Tabs");
        return `import { ${names.join(", ")} } from "expo-router";`;
      });
    }
  }
  if (!/from\s+"@expo\/vector-icons\/Ionicons"/.test(s)) {
    s = `import Ionicons from "@expo/vector-icons/Ionicons";\n` + s;
  }
  if (!/^import React from "react";/m.test(s)) {
    s = `import React from "react";\n` + s;
  }
  return s;
}

function insertQuizScreen(src) {
  if (/name\s*=\s*"quiz"/.test(src)) return src;
  if (/<\/Tabs>/.test(src)) {
    const screen = `
      <Tabs.Screen
        name="quiz"
        options={{
          title: "Quiz",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="help-circle-outline" color={color} size={size} />
          )
        }}
      />`;
    return src.replace(/<\/Tabs>/, screen + "\n    </Tabs>");
  }
  return defaultLayout;
}

if (!fs.existsSync(p)) {
  fs.writeFileSync(p, defaultLayout, "utf8");
  console.log("created layout with quiz tab");
  process.exit(0);
}

let s = fs.readFileSync(p, "utf8");
s = ensureImports(s);
s = insertQuizScreen(s);
fs.writeFileSync(p, s, "utf8");
console.log("quiz tab ensured in layout");
