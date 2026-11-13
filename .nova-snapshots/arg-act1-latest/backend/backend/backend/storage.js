const fs=require('fs')
const p=require('path').join(__dirname,'users.json')
function read(){try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch(e){return[]}}
function write(data){fs.writeFileSync(p,JSON.stringify(data,null,2))}
module.exports={read,write}
