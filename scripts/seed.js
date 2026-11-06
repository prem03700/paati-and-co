require("dotenv").config();
const mongoose=require("mongoose"),bcrypt=require("bcryptjs");
const connect=require("../src/config/db");
const User=require("../src/models/User"),Category=require("../src/models/Category"),Product=require("../src/models/Product");
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
(async()=>{
 await connect();
 const email=String(process.env.BOOTSTRAP_ADMIN_EMAIL||"").toLowerCase();
 const password=String(process.env.BOOTSTRAP_ADMIN_PASSWORD||"");
 if(!email||password.length<12)throw new Error("Set BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters in .env");
 const hash=await bcrypt.hash(password,12);
 await User.updateOne({email},{$setOnInsert:{name:"Store Administrator",email,passwordHash:hash,role:"admin",isActive:true}},{upsert:true});
 const names=["Sweets","Snacks","Coffee","Gifting"];
 const cats={};for(let i=0;i<names.length;i++){const c=await Category.findOneAndUpdate({slug:slug(names[i])},{$setOnInsert:{name:names[i],slug:slug(names[i]),sortOrder:i}},{new:true,upsert:true});cats[names[i]]=c}
 const seed=[
  ["Ghee Mysore Pak","Sweets",[{label:"200 g",sku:"SWT-MP-200",price:299,stock:30},{label:"400 g",sku:"SWT-MP-400",price:549,stock:20}]],
  ["Madras Mixture","Snacks",[{label:"200 g",sku:"SNK-MM-200",price:199,stock:40},{label:"500 g",sku:"SNK-MM-500",price:399,stock:25}]],
  ["Traditional Athirasam","Sweets",[{label:"150 g",sku:"SWT-ATH-150",price:169,stock:25}]],
  ["House Filter Coffee","Coffee",[{label:"200 g",sku:"COF-HF-200",price:249,stock:35}]],
  ["Kai Murukku","Snacks",[{label:"150 g",sku:"SNK-KM-150",price:139,stock:30}]],
  ["The Paati Gift Box","Gifting",[{label:"Classic box",sku:"GFT-PB-CLASSIC",price:799,stock:10}]]
 ];
 for(const [name,cat,variants] of seed)await Product.updateOne({slug:slug(name)},{$setOnInsert:{name,slug:slug(name),description:`Demo description for ${name}. Replace with verified product details.`,category:cats[cat]._id,variants,isPublished:true,featured:true}},{upsert:true});
 console.log("Seed complete. Admin account is ready; demo products and categories inserted if missing.");
 await mongoose.disconnect();
})().catch(async e=>{console.error(e);await mongoose.disconnect();process.exit(1)});
