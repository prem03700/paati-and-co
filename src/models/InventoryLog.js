const mongoose = require("mongoose");
const inventoryLogSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sku: String,
  change: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reason: { type: String, required: true, trim: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
inventoryLogSchema.index({ product: 1, createdAt: -1 });
module.exports = mongoose.model("InventoryLog", inventoryLogSchema);
