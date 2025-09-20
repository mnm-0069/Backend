const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const employeeSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: { type: String, unique: true },
  password: String,
  department: String,
  role: { type: String, default: "employee" }
});

employeeSchema.pre("save", async function(next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model("Employee", employeeSchema);
