const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productName: { type: String, required: true },
  variantLabel: { type: String, required: true },
  sku: { type: String, default: "" },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const addressSchema = new mongoose.Schema({
  name: String, phone: String, line1: String, line2: String,
  city: String, state: String, postalCode: String, country: { type: String, default: "India" }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  customerSnapshot: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" }
  },
  items: { type: [itemSchema], required: true },
  shippingAddress: { type: addressSchema, required: true },
  subtotal: { type: Number, required: true, min: 0 },
  shippingFee: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["placed", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled"],
    default: "placed"
  },
  paymentStatus: { type: String, enum: ["not_collected", "pending", "paid", "refunded"], default: "not_collected" },
  paymentMethod: { type: String, default: "pay_later" },
  notes: { type: String, default: "" },
  statusHistory: [{ status: String, note: String, changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, changedAt: { type: Date, default: Date.now } }]
}, { timestamps: true });

orderSchema.pre("validate", function(next) {
  if (!this.orderNumber) this.orderNumber = `PC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  next();
});
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "customerSnapshot.email": 1, createdAt: -1 });
module.exports = mongoose.model("Order", orderSchema);
