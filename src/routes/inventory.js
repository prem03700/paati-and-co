const router=require("express").Router();
const Product=require("../models/Product");
const InventoryLog=require("../models/InventoryLog");
const asyncHandler=require("../utils/asyncHandler");
const {authenticate,requireAdmin}=require("../middleware/auth");
router.use(authenticate,requireAdmin);
router.get("/",asyncHandler(async(req,res)=>{
 const products=await Product.find().populate("category","name");
 const rows=[];for(const p of products)for(const v of p.variants)rows.push({productId:p._id,productName:p.name,category:p.category?.name,variantId:v._id,label:v.label,sku:v.sku,stock:v.stock,price:v.price});
 res.json({items:rows});
}));
router.get("/logs",asyncHandler(async(req,res)=>res.json({items:await InventoryLog.find().populate("product","name").populate("changedBy","name email").sort({createdAt:-1}).limit(100)})));
router.patch("/:productId/:variantId",asyncHandler(async(req,res)=>{
 const delta=Number(req.body.change),reason=String(req.body.reason||"").trim();
 if(!Number.isInteger(delta)||delta===0||!reason)return res.status(400).json({message:"A non-zero integer change and reason are required"});
 const product=await Product.findById(req.params.productId);if(!product)return res.status(404).json({message:"Product not found"});
 const variant=product.variants.id(req.params.variantId);if(!variant)return res.status(404).json({message:"Variant not found"});
 const previous=variant.stock;if(previous+delta<0)return res.status(409).json({message:"Stock cannot become negative"});
 variant.stock=previous+delta;await product.save();
 const log=await InventoryLog.create({product:product._id,variantId:variant._id,sku:variant.sku,change:delta,previousStock:previous,newStock:variant.stock,reason,changedBy:req.user._id});
 res.json({stock:variant.stock,log});
}));
module.exports=router;
