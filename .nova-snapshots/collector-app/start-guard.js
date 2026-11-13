const required = {
  EXPO_PUBLIC_API_BASE: process.env.EXPO_PUBLIC_API_BASE || "http://192.168.1.45:5055",
  FRONTEND_URL:         process.env.FRONTEND_URL         || "http://localhost:19006",
  APP_FRONTEND_URL:     process.env.APP_FRONTEND_URL     || "http://localhost:19006",
};

const suspects = Object.keys(process.env).filter(k =>
  /URL|ORIGIN|FRONTEND|CORS/i.test(k)
);

for (const k of suspects) {
  const v = process.env[k];
  if (!v) continue;
  try {
    // normalize host casing + trim
    const u = new URL(String(v).trim());
    if (u.hostname) u.hostname = u.hostname.toLowerCase();
    process.env[k] = u.toString();
  } catch {
    // nuke invalid values so Expo can't read them
    delete process.env[k];
    console.log(`⚠︎ removed bad env ${k}=${JSON.stringify(v)}`);
  }
}

for (const [k,v] of Object.entries(required)) {
  try { new URL(v); process.env[k] = v; }
  catch { console.error(`✖ required var ${k} is invalid: ${v}`); process.exit(1); }
}

console.log("✅ Final URLs:", {
  EXPO_PUBLIC_API_BASE: process.env.EXPO_PUBLIC_API_BASE,
  FRONTEND_URL: process.env.FRONTEND_URL,
  APP_FRONTEND_URL: process.env.APP_FRONTEND_URL,
});

const { spawn } = require("node:child_process");
const p = spawn("npx", ["expo", "start", "-c", "--host", "lan"], {
  stdio: "inherit",
  shell: true,
  env: process.env
});
p.on("exit", code => process.exit(code ?? 0));
