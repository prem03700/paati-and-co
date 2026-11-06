const router = require("express").Router();
const Category = require("../models/Category");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireAdmin } = require("../middleware/auth");
router.get("/", (req,res,next)=>req.query.admin==="true"?authenticate(req,res,()=>requireAdmin(req,res,next)):next(), asyncHandler(async (req,res)=>res.json({categories:await Category.find(req.query.admin==="true"?{}:{isActive:true}).sort({sortOrder:1,name:1})})));
router.post("/", authenticate, requireAdmin, asyncHandler(async (req,res)=>res.status(201).json({category:await Category.create(req.body)})));
router.patch("/:id", authenticate, requireAdmin, asyncHandler(async (req,res)=>{const c=await Category.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!c)return res.status(404).json({message:"Category not found"});res.json({category:c})}));
router.delete("/:id", authenticate, requireAdmin, asyncHandler(async (req,res)=>{const c=await Category.findByIdAndDelete(req.params.id);if(!c)return res.status(404).json({message:"Category not found"});res.json({message:"Category deleted"})}));
module.exports=router;
