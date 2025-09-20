const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true }, // sparse allows null/undefined emails
  phone: { type: String, unique: true, sparse: true }, // same for phone
  password: { type: String, required: true },
  role: { type: String , default: "citizen" }
});

module.exports = mongoose.model("User", userSchema);
