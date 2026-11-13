const fs=require('fs'),path=require('path');
const root=process.cwd();
const compDir=path.join(root,'app','components');
const footerPath=path.join(compDir,'FooterDonate.tsx');
if(!fs.existsSync(footerPath)) process.exit(0);
function walk(dir,out=[]){
  for(const f of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,f.name);
    if(f.isDirectory()) walk(p,out);
    else if(f.isFile() && /\.tsx$/.test(f.name)) out.push(p);
  }
  return out;
}
const files=walk(path.join(root,'app'))
  .filter(f=>!f.includes(`${path.sep}ask${path.sep}`))
  .filter(f=>!f.includes(`${path.sep}+not-found.tsx`))
  .filter(f=>!f.includes(`${path.sep}components${path.sep}`));
for(const file of files){
  let src=fs.readFileSync(file,'utf8');
  if(/FooterDonate/.test(src)) continue;
  const rel=path.relative(path.dirname(file),compDir).replace(/\\/g,'/');
  const base=rel.startsWith('.')?rel:`./${rel}`;
  const importLine=`import FooterDonate from '${base}/FooterDonate';`;
  src=src.replace(/(import[^\n]*\n)/, `$1${importLine}\n`);
  if(path.basename(file)==='_layout.tsx' && src.includes('<Slot')){
    src=src.replace(/<Slot([^>]*)\/>/, `<View style={{flex:1}}><Slot$1/><FooterDonate /></View>`);
  } else if(src.includes('</View>')){
    src=src.replace(/<\/View>(?!.*<\/View>)/s, '  <FooterDonate />\n</View>');
  }
  fs.writeFileSync(file,src,'utf8');
}
process.exit(0);
