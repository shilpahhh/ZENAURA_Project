const express = require("express");
const { addContent, getAllContents, getTrainerContents } = require("../controllers/contentController");

const router = express.Router();

// Route to add new content (video/audio/document)
router.post("/add", addContent);

// Route to get all available contents
router.get("/all", getAllContents);

// Route to get contents uploaded by a specific trainer
router.get("/:trainerId", getTrainerContents);

module.exports = router;
