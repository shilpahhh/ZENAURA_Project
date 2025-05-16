const express = require("express");
const path = require("path");
const Podcast = require("../models/Podcast");

const router = express.Router();

// 📌 Fetch all podcasts
router.get("/", async (req, res) => {
  try {
    const podcasts = await Podcast.find();
    res.json(podcasts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch podcasts" });
  }
});

// 📌 Download a podcast by filename
router.get("/download/:filename", (req, res) => {
  const filePath = path.join(__dirname, "../uploads/podcasts", req.params.filename);

  // Set headers to force download
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.filename}"`);
  res.setHeader("Content-Type", "audio/mpeg");

  res.download(filePath, (err) => {
    if (err) {
      res.status(500).json({ error: "Failed to download podcast" });
    }
  });
});

module.exports = router;
