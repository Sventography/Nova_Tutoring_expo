const fs=require('fs'),path=require('path')
const up=path.join(__dirname,'users.json')
const bp=path.join(__dirname,'blacklist.json')
function readUsers(){try{return JSON.parse(fs.readFileSync(up,'utf8'))}catch(e){return[]}}
function writeUsers(v){fs.writeFileSync(up,JSON.stringify(v,null,2))}
function readBlacklist(){try{return JSON.parse(fs.readFileSync(bp,'utf8'))}catch(e){return[]}}
function writeBlacklist(v){fs.writeFileSync(bp,JSON.stringify(v,null,2))}
module.exports={readUsers,writeUsers,readBlacklist,writeBlacklist}
