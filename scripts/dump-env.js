// scripts/dump-env.js
const keys = Object.keys(process.env)
  .filter(k => /(CORS|ORIGIN|FRONTEND|API_BASE|URL|HOST)/i.test(k))
  .sort();

console.log('--- Relevant env vars Expo sees ---\n');
if (keys.length === 0) {
  console.log('(none found)');
} else {
  for (const k of keys) console.log(`${k}=${process.env[k]}`);
}
console.log('\n---------------------------------');

