const express=require('express')
const bcrypt=require('bcryptjs')
const jwt=require('jsonwebtoken')
const rateLimit=require('express-rate-limit')
const {readUsers,writeUsers,readBlacklist,writeBlacklist}=require('./storage')
const router=express.Router()
const limiter=rateLimit({windowMs:15*60*1000,max:200,standardHeaders:true,legacyHeaders:false})
router.use(limiter)
function token(email){return jwt.sign({email},process.env.JWT_SECRET,{expiresIn:'7d'})}
function auth(req,res,next){
  const h=req.headers.authorization||''
  const t=h.startsWith('Bearer ')?h.slice(7):null
  if(!t)return res.status(401).json({error:'unauth'})
  try{
    const bl=readBlacklist().filter(x=>x.exp>Date.now())
    writeBlacklist(bl)
    if(bl.find(x=>x.t===t))return res.status(401).json({error:'revoked'})
    req.user=jwt.verify(t,process.env.JWT_SECRET)
    req.token=t
    return next()
  }catch(e){return res.status(401).json({error:'unauth'})}
}
router.post('/register',async(req,res)=>{
  const {email,password,confirm}=req.body
  if(!email||!password||!confirm)return res.status(400).json({error:'missing'})
  if(password!==confirm)return res.status(400).json({error:'mismatch'})
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'email'})
  if(password.length<8)return res.status(400).json({error:'weak'})
  const users=readUsers()
  if(users.find(u=>u.email===email))return res.status(409).json({error:'exists'})
  const hash=await bcrypt.hash(password,12)
  users.push({email,password:hash,resetCode:null,resetExp:0})
  writeUsers(users)
  return res.json({ok:true,token:token(email)})
})
router.post('/login',async(req,res)=>{
  const {email,password}=req.body
  const u=readUsers().find(x=>x.email===email)
  if(!u)return res.status(401).json({error:'bad'})
  const ok=await bcrypt.compare(password,u.password)
  if(!ok)return res.status(401).json({error:'bad'})
  return res.json({ok:true,token:token(email)})
})
router.post('/logout',auth,(req,res)=>{
  const exp=Date.now()+7*24*60*60*1000
  const bl=readBlacklist();bl.push({t:req.token,exp});writeBlacklist(bl)
  return res.json({ok:true})
})
router.get('/me',auth,(req,res)=>{
  const u=readUsers().find(x=>x.email===req.user.email)
  if(!u)return res.status(404).json({error:'nf'})
  return res.json({email:u.email})
})
router.post('/request-reset',async(req,res)=>{
  const {email}=req.body
  const users=readUsers()
  const u=users.find(x=>x.email===email)
  if(!u)return res.json({ok:true})
  const code=Math.floor(100000+Math.random()*900000).toString()
  u.resetCode=code
  u.resetExp=Date.now()+15*60*1000
  writeUsers(users)
  return res.json({ok:true,code})
})
router.post('/verify-reset',(req,res)=>{
  const {email,code}=req.body
  const u=readUsers().find(x=>x.email===email)
  if(!u)return res.status(400).json({ok:false})
  if(!u.resetCode||u.resetExp<Date.now())return res.status(400).json({ok:false})
  if(u.resetCode!==code)return res.status(400).json({ok:false})
  return res.json({ok:true})
})
router.post('/reset',async(req,res)=>{
  const {email,code,newPassword}=req.body
  const users=readUsers()
  const u=users.find(x=>x.email===email)
  if(!u)return res.status(400).json({error:'bad'})
  if(!u.resetCode||u.resetExp<Date.now())return res.status(400).json({error:'expired'})
  if(u.resetCode!==code)return res.status(400).json({error:'code'})
  if(!newPassword||newPassword.length<8)return res.status(400).json({error:'weak'})
  u.password=await bcrypt.hash(newPassword,12)
  u.resetCode=null
  u.resetExp=0
  writeUsers(users)
  return res.json({ok:true})
})
module.exports=router
