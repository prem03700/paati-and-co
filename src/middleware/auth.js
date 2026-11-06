const jwt=require("jsonwebtoken");
const User=require("../models/User");
async function authenticate(req,res,next){
 try{const h=req.headers.authorization||"",token=h.startsWith("Bearer ")?h.slice(7):null;if(!token)return res.status(401).json({message:"Authentication required"});const p=jwt.verify(token,process.env.JWT_ACCESS_SECRET);const user=await User.findById(p.sub).select("_id name email phone role isActive addresses");if(!user||!user.isActive)return res.status(401).json({message:"Account unavailable"});req.user=user;next();}catch{return res.status(401).json({message:"Invalid or expired access token"});}
}
async function authenticateOptional(req,res,next){
 try{const h=req.headers.authorization||"",token=h.startsWith("Bearer ")?h.slice(7):null;if(!token)return next();const p=jwt.verify(token,process.env.JWT_ACCESS_SECRET);const user=await User.findById(p.sub).select("_id name email phone role isActive addresses");if(user&&user.isActive)req.user=user;next();}catch{return res.status(401).json({message:"Invalid or expired access token"});}
}
function requireAdmin(req,res,next){if(req.user?.role!=="admin")return res.status(403).json({message:"Admin access required"});next();}
module.exports={authenticate,authenticateOptional,requireAdmin};