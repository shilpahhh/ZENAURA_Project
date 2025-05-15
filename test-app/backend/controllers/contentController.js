const Content = require("../models/Content");

// Add New Content (Trainer Uploads)
const addContent = async (req, res) => {
  try {
    const { trainerId, title, contentType, url } = req.body;

    const newContent = new Content({
      trainerId,
      title,
      contentType,
      url,
    });

    await newContent.save();
    res.status(201).json({ message: "Content added successfully", content: newContent });
  } catch (error) {
    res.status(500).json({ message: "Error adding content" });
  }
};

// Get All Content (For Clients to View)
const getAllContent = async (req, res) => {
  try {
    const contents = await Content.find();
    res.status(200).json(contents);
  } catch (error) {
    res.status(500).json({ message: "Error fetching content" });
  }
};

// Get Content by Trainer ID (Fetch Specific Trainer's Uploaded Content)
const getContentByTrainer = async (req, res) => {
  try {
    const { trainerId } = req.params;
    const contents = await Content.find({ trainerId });

    if (!contents.length) {
      return res.status(404).json({ message: "No content found for this trainer" });
    }

    res.status(200).json(contents);
  } catch (error) {
    res.status(500).json({ message: "Error fetching content" });
  }
};

// Delete Content by ID
const deleteContent = async (req, res) => {
  try {
    const { contentId } = req.params;

    const deletedContent = await Content.findByIdAndDelete(contentId);
    if (!deletedContent) {
      return res.status(404).json({ message: "Content not found" });
    }

    res.status(200).json({ message: "Content deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting content" });
  }
};

module.exports = {
  addContent,
  getAllContent,
  getContentByTrainer,
  deleteContent,
};
