const router = require("express").Router();
const Product = require("../models/Product");
const InventoryLog = require("../models/InventoryLog");
const Category = require("../models/Category");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireAdmin } = require("../middleware/auth");

router.get("/meta/categories", asyncHandler(async (req,res) => {
  const categories = await Category.find({isActive:true}).sort({sortOrder:1,name:1});
  res.json({categories});
}));
router.get("/", (req,res,next)=>req.query.admin==="true"?authenticate(req,res,()=>requireAdmin(req,res,next)):next(), asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
  const filter = { ...(req.query.admin === "true" ? {} : { isPublished: true }) };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) filter.$text = { $search: String(req.query.search) };
  const [items, total] = await Promise.all([
    Product.find(filter).populate("category", "name slug").sort({ featured: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit),
    Product.countDocuments(filter)
  ]);
  res.json({ items, page, limit, total, pages: Math.ceil(total/limit) });
}));
router.get("/:id", (req,res,next)=>req.query.admin==="true"?authenticate(req,res,()=>requireAdmin(req,res,next)):next(), asyncHandler(async (req,res) => {
  const product = await Product.findById(req.params.id).populate("category","name slug");
  if (!product || (!product.isPublished && req.query.admin !== "true")) return res.status(404).json({message:"Product not found"});
  res.json({product});
}));
router.post("/", authenticate, requireAdmin, asyncHandler(async (req,res) => {
  const product = await Product.create(req.body);
  res.status(201).json({product});
}));
router.patch("/:id", authenticate, requireAdmin, asyncHandler(async (req,res) => {
  const allowed = ["name","slug","description","category","images","tags","variants","isPublished","featured"];
  const update = Object.fromEntries(Object.entries(req.body).filter(([k])=>allowed.includes(k)));
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({message:"Product not found"});
  const stockLogs=[];
  if (Array.isArray(update.variants)) {
    const oldById=new Map(product.variants.map(v=>[String(v._id),v]));
    const incomingIds=new Set(update.variants.filter(v=>v._id).map(v=>String(v._id)));
    for(const oldVariant of product.variants){
      if(!incomingIds.has(String(oldVariant._id))&&oldVariant.stock>0)
        return res.status(409).json({message:`Cannot remove ${oldVariant.label} while it has ${oldVariant.stock} units. Adjust stock to zero first.`});
    }
    for(const v of update.variants){
      if(v._id&&!oldById.has(String(v._id)))return res.status(400).json({message:"Invalid variant reference"});
      if(v._id&&oldById.has(String(v._id))){
        const before=oldById.get(String(v._id)),after=Number(v.stock);
        if(Number.isInteger(after)&&after!==before.stock){
          stockLogs.push({product:product._id,variantId:before._id,sku:v.sku||before.sku,change:after-before.stock,previousStock:before.stock,newStock:after,reason:"Stock adjusted from product editor",changedBy:req.user._id});
        }
      }
    }
  }
  product.set(update);
  await product.save();
  if(stockLogs.length)await InventoryLog.insertMany(stockLogs);
  await product.populate("category","name slug");
  res.json({product});
}));
router.delete("/:id", authenticate, requireAdmin, asyncHandler(async (req,res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({message:"Product not found"});
  res.json({message:"Product deleted"});
}));
module.exports = router;
