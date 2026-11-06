const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  sku: { type: String, trim: true, uppercase: true },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, default: "" },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  images: [{ type: String }],
  tags: [{ type: String, trim: true }],
  variants: { type: [variantSchema], validate: v => v.length > 0 },
  isPublished: { type: Boolean, default: false },
  featured: { type: Boolean, default: false }
}, { timestamps: true });
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1, isPublished: 1 });
module.exports = mongoose.model("Product", productSchema);
