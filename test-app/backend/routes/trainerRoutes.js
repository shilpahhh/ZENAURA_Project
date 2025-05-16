const express = require("express");
const router = express.Router();
const path = require("path");
const Trainer = require("../models/Trainer");
const Resource = require("../models/Resource");
const {
  trainerSignup,
  trainerLogin,
  getTrainerProfile,
  certificateUpload,
  videoUpload,
  uploadVideoResource,
  addMeetingResource,
  getTrainerResources,
  getClientResources,
  connectWithTrainer,
  getAssignedClients,
  getAvailableTrainers ,
  deleteResource,
} = require("../controllers/trainerController");
const { protect } = require("../middleware/trainerAuthMiddleware");
const { protectClient } = require("../middleware/authMiddleware");

// Trainer Authentication
router.post("/signup", certificateUpload.single("certificate"), trainerSignup);
router.post("/login", trainerLogin);
router.get("/profile", protect, getTrainerProfile);

// Trainer Certificate Retrieval
router.get("/certificate/:filename", (req, res) => {
  const filePath = path.join(__dirname, "../uploads/certificates", req.params.filename);
  res.sendFile(filePath);
});

// Resource Upload (Unified for Video & Meetings)
router.post("/resources/upload", protect, videoUpload.single("video"), async (req, res) => {
  try {
    console.log("Resource upload request body:", req.body);
    console.log("Resource upload file:", req.file);
    
    const { title, description, type, videoUrl, meetingLink } = req.body;
    
    // Handle clientIds from form data
    let clientIds = [];
    if (req.body.clientIds) {
      // If clientIds is a string (JSON), parse it
      if (typeof req.body.clientIds === 'string') {
        try {
          clientIds = JSON.parse(req.body.clientIds);
        } catch (e) {
          console.error("Error parsing clientIds:", e);
        }
      } 
      // If clientIds is an array (from form data), use it directly
      else if (Array.isArray(req.body.clientIds)) {
        clientIds = req.body.clientIds;
      }
    }
    
    console.log("Client IDs:", clientIds);
    
    // For video uploads, the video file is in req.file
    const videoPath = req.file ? `/uploads/videos/${req.file.filename}` : null;
    
    if (!title || !description || !type) {
      return res.status(400).json({ message: "Title, description, and type are required." });
    }
    
    if (type === "video" && !videoPath && !videoUrl) {
      return res.status(400).json({ message: "Video file or URL is required for video resources." });
    }
    
    if (type === "meeting" && !meetingLink) {
      return res.status(400).json({ message: "Meeting link is required for meeting resources." });
    }

    // Find the trainer
    const trainer = await Trainer.findById(req.trainer.id);
    if (!trainer) {
      return res.status(404).json({ message: "Trainer not found" });
    }

    // Create the resource object
    const newResource = {
      title,
      type,
      content: type === "video" ? (videoPath || videoUrl) : meetingLink,
      description,
      createdAt: new Date(),
      assignedTo: clientIds
    };

    // Add the resource to the trainer's resources array
    trainer.resources.push(newResource);
    await trainer.save();

    res.status(201).json({ 
      message: "Resource uploaded successfully", 
      resource: newResource 
    });
  } catch (error) {
    console.error("Resource upload error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/resources", async (req, res) => {
  try {
    const resources = await Resource.find();
    res.json(resources);
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ message: "Server Error", error: error.toString() });
  }
});

// Fetch Client-Specific Resources
router.get("/resources/client/:clientId", protect, getClientResources);

// Delete a Resource
router.delete("/resources/:resourceId", protect, deleteResource);

// Trainer Request Management
router.post("/send-request", protect, async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.trainer.id);
    if (!trainer) return res.status(404).json({ message: "Trainer not found" });
    if (trainer.requestStatus === "Pending") {
      return res.status(400).json({ message: "You already have a pending request" });
    }
    trainer.requestStatus = "Pending";
    await trainer.save();
    res.json({ message: "Request sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve or Reject Trainer Request (Admin Access)
router.post("/approve-request/:trainerId", async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.trainerId);
    if (!trainer) return res.status(404).json({ message: "Trainer not found" });
    trainer.requestStatus = "Approved";
    await trainer.save();
    res.json({ message: "Request approved successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Trainer Check Request Status
router.get("/request-status", protect, async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.trainer.id);
    if (!trainer) return res.status(404).json({ message: "Trainer not found" });
    res.json({
      status: trainer.requestStatus || "Not requested",
      updatedAt: trainer.updatedAt,
      notes: trainer.requestNotes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Trainer-Client Connection Endpoints
router.get("/connect/:clientId/:trainerId", connectWithTrainer);

router.post("/resources/upload/video", protect, uploadVideoResource);
router.post("/resources/upload/meeting", protect, addMeetingResource);
router.get("/trainer/resources", protect, getTrainerResources);
router.get("/available-trainers", protectClient, getAvailableTrainers);
// Get Clients Assigned to Trainer
router.get('/trainer/clients', protect, getAssignedClients);



module.exports = router;
