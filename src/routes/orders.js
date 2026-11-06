const router = require("express").Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const InventoryLog = require("../models/InventoryLog");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, authenticateOptional, requireAdmin } = require("../middleware/auth");

// A customer can only see orders attached to their own account.
router.get("/mine", authenticate, asyncHandler(async(req,res)=>{
  if(req.user.role!=="customer")return res.status(403).json({message:"Customer account required"});
  const items=await Order.find({customer:req.user._id}).sort({createdAt:-1}).limit(100);
  res.json({items});
}));

// Admin-only order management.
router.get("/", authenticate, requireAdmin, asyncHandler(async (req,res)=>{
  const page=Math.max(1,Number(req.query.page)||1),limit=Math.min(100,Number(req.query.limit)||30);
  const filter={};
  if(req.query.status)filter.status=req.query.status;
  if(req.query.search)filter.$or=[
    {orderNumber:new RegExp(req.query.search,"i")},
    {"customerSnapshot.email":new RegExp(req.query.search,"i")},
    {"customerSnapshot.name":new RegExp(req.query.search,"i")}
  ];
  const [items,total]=await Promise.all([
    Order.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit),
    Order.countDocuments(filter)
  ]);
  res.json({items,total,page,pages:Math.ceil(total/limit)});
}));

router.get("/:id", authenticate, requireAdmin, asyncHandler(async(req,res)=>{
  const order=await Order.findById(req.params.id).populate("customer","name email phone");
  if(!order)return res.status(404).json({message:"Order not found"});
  res.json({order});
}));

// Public checkout: Cash on Delivery is the only enabled payment method.
router.post("/", authenticateOptional, asyncHandler(async(req,res)=>{
  const {items,customerSnapshot,shippingAddress,notes,paymentMethod="cod"}=req.body;
  if(paymentMethod!=="cod")
    return res.status(400).json({message:"Only Cash on Delivery is currently available"});
  const name=String(customerSnapshot?.name||"").trim();
  const email=String(customerSnapshot?.email||"").trim().toLowerCase();
  const phone=String(customerSnapshot?.phone||"").trim();
  const address={
    name,phone,
    line1:String(shippingAddress?.line1||"").trim(),
    line2:String(shippingAddress?.line2||"").trim(),
    city:String(shippingAddress?.city||"").trim(),
    state:String(shippingAddress?.state||"").trim(),
    postalCode:String(shippingAddress?.postalCode||"").trim(),
    country:"India"
  };
  if(!Array.isArray(items)||!items.length||items.length>30||!name||!/^\S+@\S+\.\S+$/.test(email)||!phone||!address.line1||!address.city||!address.state||!address.postalCode)
    return res.status(400).json({message:"Enter valid contact details, delivery address and at least one cart item"});
  const resolved=[];
  for(const line of items){
    const product=await Product.findOne({_id:line.product,isPublished:true});
    if(!product)return res.status(400).json({message:"One or more products are unavailable"});
    const variant=product.variants.id(line.variantId);
    const qty=Math.floor(Number(line.quantity));
    if(!variant||!variant.isActive||!Number.isInteger(qty)||qty<1||variant.stock<qty)
      return res.status(409).json({message:`Insufficient stock or invalid quantity for ${product.name}`});
    resolved.push({product,variant,qty});
  }
  const orderItems=resolved.map(({product,variant,qty})=>({
    product:product._id,productName:product.name,variantLabel:variant.label,
    sku:variant.sku,quantity:qty,unitPrice:variant.price,lineTotal:variant.price*qty
  }));
  const subtotal=orderItems.reduce((sum,item)=>sum+item.lineTotal,0);
  const order=await Order.create({
    customer:req.user?.role==="customer"?req.user._id:undefined,
    customerSnapshot:{name,email,phone},shippingAddress:address,items:orderItems,
    subtotal,shippingFee:0,total:subtotal,notes:String(notes||"").slice(0,1000),
    paymentStatus:"pending",paymentMethod:"cod",status:"placed",
    statusHistory:[{status:"placed",note:"Order placed with Cash on Delivery."}]
  });
  for(const {product,variant,qty} of resolved){
    const previous=variant.stock;
    variant.stock-=qty;
    await product.save();
    await InventoryLog.create({
      product:product._id,variantId:variant._id,sku:variant.sku,
      change:-qty,previousStock:previous,newStock:variant.stock,
      reason:`Reserved for COD order ${order.orderNumber}`
    });
  }
  res.status(201).json({
    order:{_id:order._id,orderNumber:order.orderNumber,total:order.total,status:order.status,paymentMethod:order.paymentMethod,paymentStatus:order.paymentStatus},
    message:"Order placed successfully. Pay cash when your order is delivered."
  });
}));

router.patch("/:id/status", authenticate, requireAdmin, asyncHandler(async(req,res)=>{
  const allowed=["placed","confirmed","processing","packed","shipped","delivered","cancelled"];
  const {status,note=""}=req.body;
  if(!allowed.includes(status))return res.status(400).json({message:"Invalid order status"});
  const order=await Order.findById(req.params.id);
  if(!order)return res.status(404).json({message:"Order not found"});
  if(order.status==="delivered"||order.status==="cancelled")return res.status(409).json({message:"Delivered or cancelled orders are final"});
  if(status==="cancelled"){
    for(const item of order.items){
      if(!item.product)continue;
      const product=await Product.findById(item.product);
      if(!product)continue;
      const variant=product.variants.find(v=>v.sku===item.sku)||product.variants.find(v=>v.label===item.variantLabel);
      if(!variant)continue;
      const previous=variant.stock;
      variant.stock+=item.quantity;
      await product.save();
      await InventoryLog.create({
        product:product._id,variantId:variant._id,sku:variant.sku,
        change:item.quantity,previousStock:previous,newStock:variant.stock,
        reason:`Restocked from cancelled ${order.orderNumber}`,changedBy:req.user._id
      });
    }
  }
  order.status=status;
  order.statusHistory.push({status,note,changedBy:req.user._id});
  await order.save();
  res.json({order});
}));

router.patch("/:id/notes",authenticate,requireAdmin,asyncHandler(async(req,res)=>{
  const order=await Order.findByIdAndUpdate(req.params.id,{notes:String(req.body.notes||"")},{new:true});
  if(!order)return res.status(404).json({message:"Order not found"});
  res.json({order});
}));

module.exports=router;
