const express = require("express");
const router = express.Router();
const multer = require("multer");
const Issue = require("../models/Issue");

// Multer config (store in uploads folder)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// Citizen uploads issue
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { description, location, citizenId } = req.body;

    const newIssue = new Issue({
      citizenId,
      description,
      location,
      imageUrl: `/uploads/${req.file.filename}`
    });

    await newIssue.save();
    res.json({ success: true, message: "Issue reported", issue: newIssue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Employee fetches all issues
router.get("/", async (req, res) => {
  try {
    const issues = await Issue.find().populate("citizenId", "name email phone");
    res.json({ success: true, issues });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Employee updates issue status
router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const issue = await Issue.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, issue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
