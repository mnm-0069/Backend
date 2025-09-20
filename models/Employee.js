const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  phone: String,
  password: String,
  department: String
});

module.exports = mongoose.model("Employee", employeeSchema);
