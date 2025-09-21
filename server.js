const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const mongoose = require("mongoose");
require("dotenv").config();

// ===== MongoDB Connection =====
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ===== Models =====
const User = require("./models/User");
const Employee = require("./models/Employee");
const Issue = require("./models/Issue");

const app = express();
const PORT = process.env.PORT || 5000;

// ===== Middlewares =====
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Ensure "uploads" folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ===== Multer setup =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ========== SEED DEFAULT DATA ==========
const seedData = async () => {
  try {
    // ---- Seed Citizen ----
    const citizenEmail = "citizen1@city.com";
    let citizen = await User.findOne({ email: citizenEmail });
    if (!citizen) {
      citizen = new User({
        name: "John",
        email: citizenEmail,
        phone: "9876543210",
        password: "123456",
        role: "citizen",
      });
      await citizen.save();
      console.log("👤 Default Citizen created:", citizen.email);
    }

    // ---- Seed Employee ----
    const employeeData = {
      name: "Harry",
      email: "harry@city.com",
      phone: "9876543210",
      password: "123456",
      department: "water",
      role: "employee",
    };

    const existingEmp = await Employee.findOne({ email: employeeData.email });
    if (!existingEmp) {
      const emp = new Employee({ ...employeeData });
      await emp.save();
      console.log("👷 Default Employee created:", emp.name);
    }
  } catch (err) {
    console.error("❌ Error seeding data:", err);
  }
};

// ===== Routes =====
app.get("/", (req, res) => {
  res.json({ message: "CITYSYNC BACKEND SERVER RUNNING" });
});

//---------------- AUTH REGISTER ROUTES ----------------
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password, role, department } = req.body;

    if (!name || (!phone && !email) || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, password, role and either phone or email are required",
      });
    }

    // ✅ Duplicate check
    let existingUser;
    const orQuery = [];
    if (phone) orQuery.push({ phone });
    if (email) orQuery.push({ email });

    if (role === "citizen") {
      existingUser = await User.findOne({ $or: orQuery });
    } else if (role === "employee") {
      existingUser = await Employee.findOne({ $or: orQuery });
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Phone or Email already registered",
      });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Prepare userData (don’t insert nulls)
    const userData = {
      name,
      password: hashedPassword,
      role,
    };
    if (phone) userData.phone = phone;
    if (email) userData.email = email;
    if (role === "employee") userData.department = department || "general";

    let newUser;
    if (role === "citizen") {
      newUser = await User.create(userData);
    } else if (role === "employee") {
      newUser = await Employee.create(userData);
    }

    res.status(201).json({
      success: true,
      message: `${role} registered successfully`,
      user: newUser,
    });
  } catch (err) {
    console.error("Register Error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Phone or Email already registered",
      });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
});




//--------------------CITIZEN LOGIN-------------------
app.post("/auth/login-citizen", async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if (!password || (!email && !phone))
      return res.status(400).json({
        success: false,
        message: "Provide email or phone and password",
      });

    const user = await User.findOne({
      $or: [{ email }, { phone }],
      role: "citizen",
    });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: "citizen" },
      "prototype_secret",
      { expiresIn: "7d" }
    );
    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      token, // if you’re using JWT
    });
  } catch (err) {
    console.error("Citizen Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//------------EMPLOYEE LOGIN-------------------
app.post("/auth/login-employee", async (req, res) => {
  try {
    const { email, phone, password, department } = req.body;
    if (!password || (!email && !phone) || !department)
      return res.status(400).json({
        success: false,
        message: "Provide email or phone, password and department",
      });

    const employee = await Employee.findOne({ $or: [{ email }, { phone }] });
    if (!employee)
      return res
        .status(400)
        .json({ success: false, message: "Employee not found" });

    if (
      department &&
      employee.department.toLowerCase() !== department.toLowerCase()
    )
      return res
        .status(400)
        .json({ success: false, message: "Invalid department" });

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { id: employee._id, role: "employee" },
      "prototype_secret",
      { expiresIn: "7d" }
    );
    res.json({ success: true, token, employee });
  } catch (err) {
    console.error("Employee Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------------- ISSUE ROUTES ----------------
app.post("/issue", upload.single("image"), async (req, res) => {
  try {
    const { description, location, citizenId, citizenName, category } =
      req.body;

    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Image is required" });

    // ✅ Find citizen by ID, not name
    const citizen = await User.findById(citizenId);
    if (!citizen) {
      return res
        .status(404)
        .json({ success: false, message: "Citizen not found" });
    }

    const newIssue = new Issue({
      citizenId: citizen._id, // ✅ actual ID
      citizenName: citizen.name, // ✅ storing name
      description,
      location,
      category: category || "Other",
      imageUrl: `/uploads/${req.file.filename}`,
    });

    await newIssue.save();
    res.json({ success: true, message: "Issue reported", issue: newIssue });
  } catch (err) {
    console.error("Issue Report Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET all issues
app.get("/issue", async (req, res) => {
  try {
    const categoryFilter = req.query.category;
    let issues;
    if (categoryFilter) issues = await Issue.find({ category: categoryFilter });
    else issues = await Issue.find();
    res.json({ success: true, issues });
  } catch (err) {
    console.error("Get Issues Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Assign issue to employee
app.patch("/issue/:id/assign", async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId)
      return res
        .status(400)
        .json({ success: false, message: "employeeId is required" });

    const issue = await Issue.findById(req.params.id);
    if (!issue)
      return res
        .status(404)
        .json({ success: false, message: "Issue not found" });

    issue.assigned = true;
    issue.assignedTo = employeeId;
    await issue.save();

    res.json({ success: true, message: "Issue assigned", issue });
  } catch (err) {
    console.error("Assign Issue Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Employee assigned issues
app.get("/employee/:id/issues", async (req, res) => {
  try {
    const { id } = req.params;
    const employeeIssues = await Issue.find({ assignedTo: id });
    res.json({ success: true, issues: employeeIssues });
  } catch (err) {
    console.error("Employee Issues Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===== Start server =====
app.listen(PORT, async () => {
  console.log(`🚀 CITYSYNC BACKEND SERVER RUNNING on port ${PORT}`);
  await seedData();
});
