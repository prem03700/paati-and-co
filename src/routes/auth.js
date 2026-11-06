const router=require("express").Router();
const bcrypt=require("bcryptjs");
const User=require("../models/User");
const asyncHandler=require("../utils/asyncHandler");
const {accessToken,refreshToken,hashToken} = require("../utils/tokens");
const {authenticate}=require("../middleware/auth");

function cookieOptions(){return {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",maxAge:Number(process.env.REFRESH_TOKEN_DAYS||7)*86400000,path:"/api/auth"};}
function publicUser(user){return {id:user._id,name:user.name,email:user.email,phone:user.phone||"",role:user.role};}

router.post("/register",asyncHandler(async(req,res)=>{
  const name=String(req.body.name||"").trim();
  const email=String(req.body.email||"").trim().toLowerCase();
  const phone=String(req.body.phone||"").trim();
  const password=String(req.body.password||"");
  if(name.length<2||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||password.length<8||password.length>128)
    return res.status(400).json({message:"Enter a valid name and email. Password must be 8–128 characters."});
  if(await User.exists({email}))return res.status(409).json({message:"An account with this email already exists. Sign in instead."});
  const user=await User.create({name,email,phone,passwordHash:await bcrypt.hash(password,12),role:"customer",isActive:true});
  const raw=refreshToken();
  user.refreshTokens.push({tokenHash:hashToken(raw),expiresAt:new Date(Date.now()+Number(process.env.REFRESH_TOKEN_DAYS||7)*86400000)});
  await user.save();
  res.cookie("refreshToken",raw,cookieOptions());
  res.status(201).json({accessToken:accessToken(user),user:publicUser(user),message:"Your customer account is ready."});
}));

router.post("/customer-login",asyncHandler(async(req,res)=>{
  const email=String(req.body.email||"").trim().toLowerCase(),password=String(req.body.password||"");
  if(!email||!password)return res.status(400).json({message:"Email and password are required"});
  const user=await User.findOne({email,role:"customer"}).select("+passwordHash");
  if(!user||!user.isActive||!(await user.comparePassword(password)))return res.status(401).json({message:"Invalid customer email or password"});
  const raw=refreshToken();
  user.refreshTokens.push({tokenHash:hashToken(raw),expiresAt:new Date(Date.now()+Number(process.env.REFRESH_TOKEN_DAYS||7)*86400000)});
  await user.save();res.cookie("refreshToken",raw,cookieOptions());
  res.json({accessToken:accessToken(user),user:publicUser(user)});
}));

router.post("/login",asyncHandler(async(req,res)=>{
  const email=String(req.body.email||"").trim().toLowerCase(),password=String(req.body.password||"");
  if(!email||!password)return res.status(400).json({message:"Email and password are required"});
  const user=await User.findOne({email}).select("+passwordHash");
  if(!user||!user.isActive||!(await user.comparePassword(password)))return res.status(401).json({message:"Invalid credentials"});
  const raw=refreshToken();
  user.refreshTokens.push({tokenHash:hashToken(raw),expiresAt:new Date(Date.now()+Number(process.env.REFRESH_TOKEN_DAYS||7)*86400000)});
  await user.save();res.cookie("refreshToken",raw,cookieOptions());
  res.json({accessToken:accessToken(user),user:publicUser(user)});
}));

router.post("/refresh",asyncHandler(async(req,res)=>{
  const raw=req.cookies?.refreshToken;if(!raw)return res.status(401).json({message:"Refresh token missing"});
  const hashed=hashToken(raw),user=await User.findOne({"refreshTokens.tokenHash":hashed});
  if(!user||!user.isActive||(req.body?.accountType==="customer"&&user.role!=="customer"))return res.status(401).json({message:"Invalid refresh token"});
  const entry=user.refreshTokens.find(t=>t.tokenHash===hashed);
  if(!entry||entry.expiresAt<new Date()){user.refreshTokens=user.refreshTokens.filter(t=>t.tokenHash!==hashed);await user.save();return res.status(401).json({message:"Refresh token expired"});}
  user.refreshTokens=user.refreshTokens.filter(t=>t.tokenHash!==hashed);
  const next=refreshToken();user.refreshTokens.push({tokenHash:hashToken(next),expiresAt:new Date(Date.now()+Number(process.env.REFRESH_TOKEN_DAYS||7)*86400000)});
  await user.save();res.cookie("refreshToken",next,cookieOptions());res.json({accessToken:accessToken(user),user:publicUser(user)});
}));

router.post("/logout",asyncHandler(async(req,res)=>{
  const raw=req.cookies?.refreshToken;
  if(raw)await User.updateOne({"refreshTokens.tokenHash":hashToken(raw)},{$pull:{refreshTokens:{tokenHash:hashToken(raw)}}});
  res.clearCookie("refreshToken",{...cookieOptions(),maxAge:undefined});res.json({message:"Logged out"});
}));
router.get("/me",authenticate,(req,res)=>res.json({user:publicUser(req.user)}));
router.patch("/me",authenticate,asyncHandler(async(req,res)=>{
  const name=String(req.body.name||"").trim(),phone=String(req.body.phone||"").trim();
  if(name.length<2||name.length>100)return res.status(400).json({message:"Enter a valid name"});
  const user=await User.findByIdAndUpdate(req.user._id,{$set:{name,phone}},{new:true,runValidators:true}).select("_id name email phone role");
  res.json({user:publicUser(user),message:"Profile updated"});
}));

router.get("/addresses",authenticate,asyncHandler(async(req,res)=>{
  res.json({addresses:req.user.addresses||[]});
}));
router.post("/addresses",authenticate,asyncHandler(async(req,res)=>{
  const body=req.body||{};
  const address={
    label:String(body.label||"Home").trim().slice(0,40),
    name:String(body.name||req.user.name).trim(),
    phone:String(body.phone||req.user.phone||"").trim(),
    line1:String(body.line1||"").trim(),
    line2:String(body.line2||"").trim(),
    city:String(body.city||"").trim(),
    state:String(body.state||"").trim(),
    postalCode:String(body.postalCode||"").trim(),
    country:"India"
  };
  if(!address.line1||!address.city||!address.state||! /^[0-9]{6}$/.test(address.postalCode))
    return res.status(400).json({message:"Enter address, city, state and a valid 6-digit PIN code."});
  const user=await User.findById(req.user._id);
  const duplicate=user.addresses.find(a=>a.line1.toLowerCase()===address.line1.toLowerCase()&&a.city.toLowerCase()===address.city.toLowerCase()&&a.state.toLowerCase()===address.state.toLowerCase()&&a.postalCode===address.postalCode);
  if(duplicate)return res.json({addresses:user.addresses,message:"This address is already saved."});
  if(user.addresses.length>=10)return res.status(400).json({message:"You can save up to 10 delivery addresses."});
  address.isDefault=user.addresses.length===0||Boolean(body.isDefault);
  if(address.isDefault)user.addresses.forEach(a=>a.isDefault=false);
  user.addresses.push(address);
  await user.save();
  res.status(201).json({addresses:user.addresses,message:"Delivery address saved."});
}));
router.delete("/addresses/:addressId",authenticate,asyncHandler(async(req,res)=>{
  const user=await User.findById(req.user._id);
  const address=user.addresses.id(req.params.addressId);
  if(!address)return res.status(404).json({message:"Saved address not found."});
  const wasDefault=address.isDefault;
  address.deleteOne();
  if(wasDefault&&user.addresses.length)user.addresses[0].isDefault=true;
  await user.save();
  res.json({addresses:user.addresses,message:"Saved address removed."});
}));
router.patch("/addresses/:addressId/default",authenticate,asyncHandler(async(req,res)=>{
  const user=await User.findById(req.user._id);
  const address=user.addresses.id(req.params.addressId);
  if(!address)return res.status(404).json({message:"Saved address not found."});
  user.addresses.forEach(a=>a.isDefault=String(a._id)===String(address._id));
  await user.save();
  res.json({addresses:user.addresses,message:"Default address updated."});
}));

module.exports=router;