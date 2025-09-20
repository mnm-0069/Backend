const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  role: {type : String , default : "employee"}
});

module.exports = mongoose.model("Employee", employeeSchema);
