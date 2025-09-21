// models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, sparse: true },   // optional
  phone: { type: String, sparse: true },   // optional
  password: { type: String, required: true },
  role: { type: String, required: true , default : "citizen" },
});

module.exports = mongoose.model("User", UserSchema);
