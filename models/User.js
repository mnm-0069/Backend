const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    unique: true,
    sparse: true,       // allows multiple docs with null email
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,       // allows multiple docs with null phone
    trim: true,
  },
  password: { type: String, required: true },
  role: { type: String, required: true, default: "citizen" },
}, { timestamps: true });

// Compound sparse unique index to ensure email OR phone uniqueness
UserSchema.index({ email: 1, phone: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("User", UserSchema);
