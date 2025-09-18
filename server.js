const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");

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

// ===== In-Memory Storage =====
const users = [];
const issues = [];
//Default Employees
let employees = [
  { id: "1", email: "emp1@city.com", phone: "9876543210", password: "123456", department: "water" },
  { id: "2", email: "emp2@city.com", phone: "9999999999", password: "abcd", department: "garbage" },
];

// ===== Routes =====
app.get("/", (req, res) => {
  res.json({ message: "CITYSYNC BACKEND SERVER RUNNING" });
});

// ---------------- AUTH ROUTES ----------------
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!password || !role)
      return res.status(400).json({ success: false, message: "Role & password required" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = Date.now().toString();

    users.push({ id, name, email, phone, password: hashedPassword, role });
    res.json({ success: true, message: "User registered", id });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, phone, password, role } = req.body;

    const user = users.find(
      (u) => (u.email === email || u.phone === phone) && u.role === role
    );
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, "prototype_secret", {
      expiresIn: "7d",
    });

    res.json({ success: true, token, role: user.role });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//------------EMPLOYEE LOGIN-------------------
app.post("/employee/login", (req, res) => {
  try {
    const { email, phone, password, department } = req.body;

    if ((!email && !phone) || !password || !department) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // ✅ Find existing employee
    const employee = employees.find(
      (emp) =>
        (emp.email === email || emp.phone === phone) &&
        emp.password === password &&
        emp.department === department
    );

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
app.post("/issue", upload.single("image"), (req, res) => {
  try {
    const { description, location, citizenId, category } = req.body;

    if (!req.file)
      return res.status(400).json({ success: false, message: "Image is required" });

    const id = Date.now().toString();
    const newIssue = {
      id,
      citizenId,
      description,
      location,
      category: category || "Other",
      imageUrl: `/uploads/${req.file.filename}`,
      status: "pending",
      assigned: false,       // ✅ NEW FIELD
      assignedTo: null,      // ✅ Employee ID (null by default)
    };

    issues.push(newIssue);

    res.json({ success: true, message: "Issue reported", issue: newIssue });
  } catch (err) {
    console.error("Issue Report Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// GET route to fetch all issues
app.get("/issue", (req, res) => {
  const categoryFilter = req.query.category; // optional query parameter
  let filteredIssues = issues;

  if (categoryFilter) {
    filteredIssues = issues.filter(
      (issue) => issue.category === categoryFilter
    );
  }

  res.json({ success: true, issues: filteredIssues });
});


// ---------------- GET ALL UPLOADED IMAGES IN JSON ----------------
app.get("/uploads-json", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error("Error reading uploads folder:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    const fileUrls = files.map(
      (file) => `${req.protocol}://${req.get("host")}/uploads/${file}`
    );

    res.json({ success: true, files: fileUrls });
  });
});

//--------------GET ISSUES CATEGORY WISE-------------------------
app.get("/issues/category/:type", (req, res) => {
  const type = req.params.type;
  const filtered = issues.filter(i => i.category === type);

  res.json({ success: true, issues: filtered });
});


// ---------------- ASSIGN ISSUE TO EMPLOYEE ----------------
app.patch("/issue/:id/assign", (req, res) => {
  try {
    const { employeeId } = req.body;
    const issue = issues.find((i) => i.id === req.params.id);

    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });

    if (!employeeId) return res.status(400).json({ success: false, message: "employeeId is required" });

    issue.assigned = true;
    issue.assignedTo = employeeId;

    res.json({ success: true, message: "Issue assigned", issue });
  } catch (err) {
    console.error("Assign Issue Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ---------------- GET EMPLOYEE'S ASSIGNED ISSUES ----------------


//-------------UPDATING/SUBMITTING THE ISSUE BY EMPLOYEE-------------
app.patch("/issue/:id", (req, res) => {
  try {
    const issue = issues.find((i) => i.id === req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });

    issue.status = req.body.status || issue.status;
    res.json({ success: true, issue });
  } catch (err) {
    console.error("Update Issue Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`🚀 CITYSYNC BACKEND SERVER RUNNING on port ${PORT}`);
});
