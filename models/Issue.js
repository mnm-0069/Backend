const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema({
  citizenId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  description: String,
  location: String,
  category: { type: String, default: "Other" },
  imageUrl: String,
  status: { type: String, default: "pending" },
  assigned: { type: Boolean, default: false },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null }
}, { timestamps: true });

module.exports = mongoose.model("Issue", issueSchema);
