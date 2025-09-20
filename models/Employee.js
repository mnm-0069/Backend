const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: { type: String, unique: true },
  password: String,
  department: String,
  role: { type: String, default: "employee" }
});


module.exports = mongoose.model("Employee", employeeSchema);
