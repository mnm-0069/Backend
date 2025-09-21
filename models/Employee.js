// models/Employee.js
const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },   // optional
  phone: { type: String, unique: true, sparse: true },   // optional
  password: { type: String, required: true },
  department: { type: String, default: "general" },
  role: { type: String, required: true , default : "employee"},
});

module.exports = mongoose.model("Employee", EmployeeSchema);
