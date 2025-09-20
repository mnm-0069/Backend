// models/Employee.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const employeeSchema = new Schema(
  {
    name: { type: String },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    department: { type: String },
    role: { type: String, default: "employee" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", employeeSchema);
