const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Multer config (store in uploads folder)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// Temporary in-memory storage for issues
let issues = [];

// Citizen uploads issue
router.post("/", upload.single("image"), (req, res) => {
  try {
    const { description, location, citizenId } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    const newIssue = {
      id: issues.length + 1,
      citizenId,
      description,
      location,
      imageUrl: `/uploads/${req.file.filename}`,
      status: "pending",
      createdAt: new Date()
    };

    issues.push(newIssue);
    res.json({ success: true, message: "Issue reported", issue: newIssue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Employee fetches all issues
router.get("/", (req, res) => {
  try {
    res.json({ success: true, issues });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Employee updates issue status
router.patch("/:id", (req, res) => {
  try {
    const { status } = req.body;
    const issue = issues.find(i => i.id === parseInt(req.params.id));

    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    issue.status = status || issue.status;
    res.json({ success: true, issue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
