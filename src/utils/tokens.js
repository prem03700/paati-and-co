const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function accessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_TTL || "15m" }
  );
}
function refreshToken() {
  return crypto.randomBytes(48).toString("hex");
}
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
module.exports = { accessToken, refreshToken, hashToken };
