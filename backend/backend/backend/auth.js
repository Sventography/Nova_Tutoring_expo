const express=require('express')
const bcrypt=require('bcryptjs')
const jwt=require('jsonwebtoken')
const {read,write}=require('./storage')
const router=express.Router()
function issue(email){return jwt.sign({email},process.env.JWT_SECRET,{expiresIn:'7d'})}
router.post('/register',async(req,res)=>{const{email,password,confirm}=req.body;if(!email||!password||!confirm)return res.status(400).json({error:'missing'});if(password!==confirm)return res.status(400).json({error:'mismatch'});const users=read();if(users.find(u=>u.email===email))return res.status(409).json({error:'exists'});const hash=await bcrypt.hash(password,10);users.push({email,password:hash,resetCode:null});write(users);return res.json({ok:true,token:issue(email)})})
router.post('/login',async(req,res)=>{const{email,password}=req.body;const users=read();const u=users.find(x=>x.email===email);if(!u)return res.status(401).json({error:'bad'});const ok=await bcrypt.compare(password,u.password);if(!ok)return res.status(401).json({error:'bad'});return res.json({ok:true,token:issue(email)})})
router.post('/request-reset',async(req,res)=>{const{email}=req.body;const users=read();const u=users.find(x=>x.email===email);if(!u)return res.json({ok:true});const code=Math.floor(100000+Math.random()*900000).toString();u.resetCode=code;write(users);return res.json({ok:true,code})
})
router.post('/reset',async(req,res)=>{const{email,code,newPassword}=req.body;const users=read();const u=users.find(x=>x.email===email);if(!u)return res.status(400).json({error:'bad'});if(u.resetCode!==code)return res.status(400).json({error:'code'});u.password=await bcrypt.hash(newPassword,10);u.resetCode=null;write(users);return res.json({ok:true})
})
module.exports=router
