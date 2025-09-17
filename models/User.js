const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: String,
  role: { type: String, enum: ["citizen", "employee"], required: true }
});

module.exports = mongoose.model("User", userSchema);
