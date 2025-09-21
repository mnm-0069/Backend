const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: false, unique: true, sparse: true },
  phone: { type: String, required: false, unique: true, sparse: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  role: { type: String, default: "employee" }
});

module.exports = mongoose.model("Employee", employeeSchema);
