const fs=require('fs'),path=require('path');
const root=process.cwd();
const compDir=path.join(root,'app','components');
const footerPath=path.join(compDir,'FooterDonate.tsx');
if(!fs.existsSync(footerPath)) process.exit(0);
function walk(dir,out=[]){
  for(const f of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,f.name);
    if(f.isDirectory()){
      walk(p,out);
    }else if(f.isFile() && /\.tsx$/.test(f.name)){
      out.push(p);
    }
  }
  return out;
}
const files=walk(path.join(root,'app'))
  .filter(f=>!f.includes(`${path.sep}ask${path.sep}`))
  .filter(f=>path.basename(f) !== '+not-found.tsx')
  .filter(f=>!f.includes(`${path.sep}components${path.sep}`));

for(const file of files){
  let src=fs.readFileSync(file,'utf8');
  if(/FooterDonate/.test(src)) continue;
  const rel=path.relative(path.dirname(file),compDir).replace(/\\/g,'/');
  const importLine=`import FooterDonate from '${rel.startsWith('.')?rel:'./'+rel}/FooterDonate';`;
  const hasImports=/^\s*import\s/m.test(src);
  if(hasImports){
    src=src.replace(/(^\s*import[^\n]*\n)(?!.*)/m, (m)=>m)+importLine+"\n";
  }else{
    src=importLine+"\n"+src;
  }
  const closingViewIdx=src.lastIndexOf('</View>');
  if(closingViewIdx!==-1){
    src=src.slice(0,closingViewIdx)+'  <FooterDonate />\n'+src.slice(closingViewIdx);
  }else if(/return\s*\(/.test(src)){
    src=src.replace(/return\s*\(/, match=>`${match}<FooterDonate />`);
  }
  fs.writeFileSync(file,src,'utf8');
}
process.exit(0);
