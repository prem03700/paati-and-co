const router=require("express").Router();
const User=require("../models/User");
const Order=require("../models/Order");
const asyncHandler=require("../utils/asyncHandler");
const {authenticate,requireAdmin}=require("../middleware/auth");
router.use(authenticate,requireAdmin);
router.get("/",asyncHandler(async(req,res)=>{
 const page=Math.max(1,Number(req.query.page)||1),limit=Math.min(100,Number(req.query.limit)||30);
 const filter={role:"customer"};if(req.query.search)filter.$or=[{name:new RegExp(req.query.search,"i")},{email:new RegExp(req.query.search,"i")}];
 const [items,total]=await Promise.all([User.find(filter).select("name email phone isActive createdAt").sort({createdAt:-1}).skip((page-1)*limit).limit(limit),User.countDocuments(filter)]);
 res.json({items,total,page,pages:Math.ceil(total/limit)});
}));
router.patch("/:id",asyncHandler(async(req,res)=>{const user=await User.findOneAndUpdate({_id:req.params.id,role:"customer"},{isActive:!!req.body.isActive},{new:true}).select("name email phone isActive");if(!user)return res.status(404).json({message:"Customer not found"});res.json({user})}));
router.get("/:id/orders",asyncHandler(async(req,res)=>res.json({items:await Order.find({customer:req.params.id}).sort({createdAt:-1}).limit(100)})));
module.exports=router;
