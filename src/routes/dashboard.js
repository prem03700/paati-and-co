const router=require("express").Router();
const Order=require("../models/Order");
const Product=require("../models/Product");
const User=require("../models/User");
const asyncHandler=require("../utils/asyncHandler");
const {authenticate,requireAdmin}=require("../middleware/auth");
router.get("/summary",authenticate,requireAdmin,asyncHandler(async(req,res)=>{
 const since=new Date();since.setDate(since.getDate()-30);
 const [orders,totalOrders,customers,products,lowStock,recentOrders,statusCounts]=await Promise.all([
  Order.aggregate([{$match:{createdAt:{$gte:since},status:{$ne:"cancelled"}}},{$group:{_id:null,revenue:{$sum:"$total"},count:{$sum:1}}}]),
  Order.countDocuments(),User.countDocuments({role:"customer"}),Product.countDocuments(),
  Product.aggregate([{$unwind:"$variants"},{$match:{"variants.stock":{$lte:5}}},{$count:"count"}]),
  Order.find().sort({createdAt:-1}).limit(8).select("orderNumber customerSnapshot total status createdAt"),
  Order.aggregate([{$group:{_id:"$status",count:{$sum:1}}}])
 ]);
 res.json({summary:{revenue30Days:orders[0]?.revenue||0,orders30Days:orders[0]?.count||0,totalOrders,customers,products,lowStockVariants:lowStock[0]?.count||0},recentOrders,statusCounts});
}));
module.exports=router;
