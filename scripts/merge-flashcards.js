const fs=require('fs'),path=require('path');
const OUT=path.join('app','data','flashcards.json');
const DIR=path.join('app','data','packs');
let merged=[];
if(fs.existsSync(DIR)){
  for(const f of fs.readdirSync(DIR).filter(x=>x.endsWith('.json'))){
    const arr=JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'));
    if(Array.isArray(arr)) merged=merged.concat(arr);
  }
}
fs.writeFileSync(OUT,JSON.stringify({topics:merged},null,2));
console.log('Merged topics:',merged.length,'->',OUT);
