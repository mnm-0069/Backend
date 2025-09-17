const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ===== In-Memory Storage =====
const users = []; // { id, name, email, phone, password, role }
const issues = []; // { id, citizenId, description, location, imageUrl, status }

// ===== Routes =====

// Test route
app.get("/", (req, res) => {
  res.json({ message: "CITYSYNC BACKEND SERVER RUNNING" });
});

// Auth Routes
app.post("/auth/register", async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!password || !role)
    return res
      .status(400)
      .json({ success: false, message: "Role & password required" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const id = Date.now().toString();
  users.push({ id, name, email, phone, password: hashedPassword, role });
  res.json({ success: true, message: "User registered", id });
});

app.post("/auth/login", async (req, res) => {
  const { email, phone, password, role } = req.body;
  const user = users.find(
    (u) => (u.email === email || u.phone === phone) && u.role === role
  );
  if (!user)
    return res.status(400).json({ success: false, message: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res
      .status(400)
      .json({ success: false, message: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, role: user.role }, "prototype_secret", {
    expiresIn: "7d",
  });
  res.json({ success: true, token, role: user.role });
});

// Issue Routes
app.post("/issue", (req, res) => {
  console.log(req.body);
  // console.log(req.params);
  // if (!req.file)
  //   return res
  //     .status(400)
  //     .json({ success: false, message: "Image is required" });

  // const id = Date.now().toString();
  // const newIssue = {
  //   id,
  //   citizenId,
  //   description,
  //   location,
  //   status: "pending",
  // };
  // issues.push(newIssue);
  res.json({ success: true, message: "Issue reported", issue: newIssue });
});

// Get all issues (for employee/admin)
app.get("/issue", (req, res) => {
  res.json({ success: true, issues });
});

// Update issue status
app.patch("/issue/:id", (req, res) => {
  const issue = issues.find((i) => i.id === req.params.id);
  if (!issue)
    return res.status(404).json({ success: false, message: "Issue not found" });

  issue.status = req.body.status || issue.status;
  res.json({ success: true, issue });
});

// Start server
app.listen(PORT, () => {
  console.log(`CITYSYNC BACKEND SERVER RUNNING`);
});
