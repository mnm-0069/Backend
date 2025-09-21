const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: false, unique: true, sparse: true },
  phone: { type: String, required: false, unique: true, sparse: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
});


module.exports = mongoose.model("User", userSchema);
