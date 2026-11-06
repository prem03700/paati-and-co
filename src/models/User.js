const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 40, default: "Home" },
  name: { type: String, trim: true, maxlength: 100 },
  phone: { type: String, trim: true, maxlength: 20 },
  line1: { type: String, trim: true, maxlength: 160, required: true },
  line2: { type: String, trim: true, maxlength: 160, default: "" },
  city: { type: String, trim: true, maxlength: 80, required: true },
  state: { type: String, trim: true, maxlength: 80, required: true },
  postalCode: { type: String, trim: true, match: /^[0-9]{6}$/, required: true },
  country: { type: String, default: "India" },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

const refreshSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: "" },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  isActive: { type: Boolean, default: true },
  refreshTokens: { type: [refreshSchema], default: [] },
  addresses: { type: [addressSchema], default: [] }
}, { timestamps: true });

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.passwordHash);
};
userSchema.index({ role: 1, createdAt: -1 });
module.exports = mongoose.model("User", userSchema);
