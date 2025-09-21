// models/Employee.js
const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  department: { type: String, default: "general" },
  role: { type: String, default: "employee" },
  assignedIssues: [{ type: mongoose.Schema.Types.ObjectId, ref: "Issue" }], // <-- new field
});

module.exports = mongoose.model("Employee", EmployeeSchema);
