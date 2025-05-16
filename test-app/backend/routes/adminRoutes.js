const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Admin login
router.post("/login", adminController.adminLogin);

// Get all clients
router.get("/clients", verifyToken, adminController.getAllClients);

// Book management
router.post("/books", verifyToken, upload.single("file"), adminController.uploadBook);
router.get("/books", verifyToken, adminController.getAllBooks);
router.delete("/books/:id", verifyToken, adminController.deleteBook);

// Podcast management
router.post("/podcasts", verifyToken, upload.single("file"), adminController.uploadPodcast);
router.get("/podcasts", verifyToken, adminController.getAllPodcasts);
router.delete("/podcasts/:id", verifyToken, adminController.deletePodcast);

// Trainer request management
router.get("/trainer-requests", verifyToken, adminController.getTrainerRequests);
router.put("/trainer-requests/:id/approve", verifyToken, adminController.approveTrainerRequest);
router.put("/trainer-requests/:id/reject", verifyToken, adminController.rejectTrainerRequest);

module.exports = router;
