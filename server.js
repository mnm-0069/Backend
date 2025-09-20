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
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

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
      const hashedPassword = await bcrypt.hash("123456", 10);
      citizen = new User({
        name: "John",
        email: citizenEmail,
        phone: "9876543210",
        password: hashedPassword,
        role: "citizen",
      });
      await citizen.save();
      console.log("👤 Default Citizen created:", citizen.email);
    }

    // ---- Seed Employees ----
    const employeesData = [
      { email: "emp1@city.com", phone: "9876543210", password: "123456", department: "water" },
      { email: "emp2@city.com", phone: "1002", password: "123456", department: "electricity" },
      { email: "emp3@city.com", phone: "1003", password: "123456", department: "road" },
      { email: "emp4@city.com", phone: "1004", password: "123456", department: "sanitation" },
    ];

    for (let empData of employeesData) {
      const existing = await Employee.findOne({ email: empData.email });
      if (!existing) {
        const emp = new Employee(empData); // plain password for now
        await emp.save();
        console.log("👷 Default Employee created:", emp.email);
      }
    }

  } catch (err) {
    console.error("❌ Error seeding data:", err);
  }
};

// ===== Routes =====
app.get("/", (req, res) => {
  res.json({ message: "CITYSYNC BACKEND SERVER RUNNING" });
});

// ---------------- AUTH ROUTES ----------------
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password, role, department } = req.body;

    if (!email || !password || !role)
      return res.status(400).json({ success: false, message: "Email, password & role are required" });

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ success: false, message: "Email already registered" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user object
    const userData = { name, email, phone, password: hashedPassword, role };
    if (role === "employee") userData.department = department || "general";

    // Save to MongoDB
    const newUser = await User.create(userData);

    res.json({ success: true, message: `${role} registered`, user: newUser });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


//--------------------CITIZEN LOGIN-------------------
app.post("/auth/login", async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    // Find user by email or phone in MongoDB
    const user = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      "prototype_secret",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      role: user.role,
      name: user.name,
      email: user.email
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


//------------EMPLOYEE LOGIN-------------------
app.post("/employee/login", async (req, res) => {
  try {
    const { email, phone, password, department } = req.body;

    if ((!email && !phone) || !password || !department) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const employee = await Employee.findOne({
      $or: [{ email }, { phone }],
      password,
      department
    });

    if (!employee) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    res.json({
      success: true,
      message: "Employee login successful",
      employee,
    });
  } catch (err) {
    console.error("Employee Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------------- ISSUE ROUTES ----------------
app.post("/issue", upload.single("image"), async (req, res) => {
  try {
    const { description, location, citizenId, category } = req.body;

    if (!req.file)
      return res.status(400).json({ success: false, message: "Image is required" });

    const newIssue = new Issue({
      citizenId,
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

// GET route to fetch all issues
app.get("/issue", async (req, res) => {
  try {
    const categoryFilter = req.query.category;
    let issues;
    if (categoryFilter) {
      issues = await Issue.find({ category: categoryFilter });
    } else {
      issues = await Issue.find();
    }
    res.json({ success: true, issues });
  } catch (err) {
    console.error("Get Issues Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------------- ASSIGN ISSUE TO EMPLOYEE ----------------
app.patch("/issue/:id/assign", async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: "employeeId is required" });

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });

    issue.assigned = true;
    issue.assignedTo = employeeId;
    await issue.save();

    res.json({ success: true, message: "Issue assigned", issue });
  } catch (err) {
    console.error("Assign Issue Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------------- GET EMPLOYEE'S ASSIGNED ISSUES ----------------
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
  await seedData(); // 🔥 Seed defaults on startup
});
