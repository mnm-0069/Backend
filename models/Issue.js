const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema({
  citizenId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  description: String,
  imageUrl: String,
  location: String,
  status: { type: String, enum: ["pending", "in-progress", "resolved"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Issue", issueSchema);
