import fs from "fs";
const pathFile = "package.json";
const pkg = fs.existsSync(pathFile) ? JSON.parse(fs.readFileSync(pathFile, "utf8")) : { name:"app", private:true };
pkg.scripts ||= {};
pkg.scripts["gen:shop"] = "node scripts/gen-shop-manifest.mjs";
fs.writeFileSync(pathFile, JSON.stringify(pkg, null, 2));
console.log('✅ Added script "gen:shop" to package.json');
