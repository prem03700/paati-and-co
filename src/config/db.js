const mongoose = require("mongoose");

async function connectDatabase() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing");
  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
module.exports = connectDatabase;
