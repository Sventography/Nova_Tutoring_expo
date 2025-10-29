import fs from 'fs';
import path from 'path';
const ROOT = 'app';
function list(dir){const out=[];const st=[dir];while(st.length){const d=st.pop();for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())st.push(p);else if(/\.(tsx|ts|jsx|js)$/.test(e.name))out.push(p);}}return out;}
const files=list(ROOT);
let n=0;
for(const f of files){
  let s=fs.readFileSync(f,'utf8');
  const s0=s;
  s=s.replace(/<Redirect\s+href=['"]\/\((tabs)\)\/flashcards['"][^>]*\/>\s*/g, ''); 
  s=s.replace(/router\.(replace|push)\(\s*['"`]\/\((tabs)\)\/flashcards['"`]\s*\)\s*;?/g, '/* removed auto nav to flashcards */');
  if(s!==s0){ fs.writeFileSync(f,s); console.log('Removed redirect in',f); n++; }
}
console.log('Done. Files changed:', n);
