const multer = require("multer");
const Trainer = require("../models/Trainer"); // Fixed path
const Client = require("../models/Client");
const Resource = require("../models/Resource");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Multer storage configuration for certificates
const certificateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/certificates/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Multer storage configuration for videos
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/videos/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Configure multer for different upload types
const certificateUpload = multer({ 
  storage: certificateStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for certificates
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for videos
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  }
});

// Function to generate JWT token
const generateToken = (id) => {
  const jwtSecret = process.env.JWT_SECRET || "default_secret"; // Fallback
  return jwt.sign({ id }, jwtSecret, { expiresIn: "30d" });
};

// Existing functions
const trainerSignup = asyncHandler(async (req, res) => {
  console.log("Signup request received:", req.body);
  console.log("File received:", req.file);

  const { name, email, password, contact, experience } = req.body;
  const certificate = req.file ? req.file.filename : null; // Handle file

  // Check for missing fields
  if (!name || !email || !password || !contact || !experience || !certificate) {
    return res.status(400).json({ message: "All fields are required, including the certificate" });
  }

  // Check if trainer already exists
  const existingTrainer = await Trainer.findOne({ email });
  if (existingTrainer) {
    return res.status(400).json({ message: "Email already exists" });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create new trainer object
  const newTrainer = new Trainer({
    name,
    email,
    password: hashedPassword,
    contact,
    experience,
    certificate,
  });

  try {
    // Save trainer to the database
    const savedTrainer = await newTrainer.save();

    console.log("Trainer saved successfully:", savedTrainer);

    // Return response with token
    res.status(201).json({
      success: true,
      message: "Trainer signed up successfully!",
      trainerId: savedTrainer._id,
      name: savedTrainer.name,
      email: savedTrainer.email,
      certificate: savedTrainer.certificate,
      experience: savedTrainer.experience,
      token: generateToken(savedTrainer._id), // JWT Token for session management
    });
  } catch (error) {
    console.error("Error saving trainer:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

const trainerLogin = async (req, res) => {
  const { email, password } = req.body;
  console.log("Login attempt for email:", email);

  try {
    const trainer = await Trainer.findOne({ email });
    console.log("Trainer found:", trainer ? "Yes" : "No");

    if (!trainer) {
      return res.status(401).json({ success: false, message: "Trainer not found" });
    }

    const isMatch = await bcrypt.compare(password, trainer.password);
    console.log("Password Match:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: trainer._id },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "50d" }
    );

    console.log("Generated token:", token.substring(0, 10) + "...");
    console.log("Trainer ID:", trainer._id);

    res.status(200).json({
      success: true,
      token,
      trainer: {
        _id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        requestStatus: trainer.requestStatus,
        isApproved: trainer.isApproved
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

const getTrainerById = async (req, res) => {
  const { id } = req.params; // Extract trainerId from URL

  try {
    const trainer = await Trainer.findById(id).select("-password");

    if (!trainer) {
      return res.status(404).json({ message: "Trainer not found" });
    }

    res.status(200).json(trainer);
  } catch (error) {
    console.error("Error fetching trainer:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getTrainerProfile = async (req, res) => {
  try {
    const trainerId = req.trainer.id;
    const trainer = await Trainer.findById(trainerId).select('-password');

    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }
    
    // Create a new object with the complete certificate URL
    const trainerData = trainer.toObject();
    if (trainerData.certificate) {
      trainerData.certificate = `http://localhost:5000/uploads/certificates/${trainerData.certificate}`;
    }

    res.status(200).json(trainerData);
  } catch (error) {
    console.error('Error fetching trainer profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendTrainerRequest = async (req, res) => {
  try {
    const { trainerId } = req.params;
    console.log("Incoming request to send trainer request for ID:", trainerId); // Debugging log

    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      console.log("Trainer not found!"); // Debugging log
      return res.status(404).json({ message: "Trainer not found" });
    }

    console.log("Current request status before update:", trainer.requestStatus); // Debugging log

    // Only allow request if it hasn't been sent before
    if (trainer.requestStatus !== "Not Sent") {
      console.log("Request already sent or processed!"); // Debugging log
      return res.status(400).json({ message: "Request already sent or processed!" });
    }

    trainer.requestStatus = "Pending"; // Update status
    await trainer.save(); // Save the update in the database

    console.log("Updated request status:", trainer.requestStatus); // Debugging log
    res.status(200).json({ success: true, message: "Request sent successfully!" });
  } catch (error) {
    console.error("Error sending request:", error);
    res.status(500).json({ message: "Server error" });
  }
};




const uploadVideoResource = async (req, res) => {
  try {
    const { trainerId } = req.params;
    const { title, type, content, description } = req.body;

    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return res.status(404).json({ message: "Trainer not found" });
    }

    const newResource = {
      title,
      type,
      content,
      description,
      createdAt: new Date(),
    };

    trainer.resources.push(newResource);
    await trainer.save();

    res.status(201).json({ message: "Resource uploaded successfully", resource: newResource });
  } catch (error) {
    console.error("Error uploading resource:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Add a meeting link resource
const addMeetingResource = asyncHandler(async (req, res) => {
  const { title, meetingLink, description, clientIds } = req.body;

  if (!meetingLink) {
    return res.status(400).json({ message: 'Meeting link is required' });
  }

  try {
    const trainer = await Trainer.findById(req.trainer.id);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    // More robust client assignment
    const assignedTo = clientIds && clientIds.length > 0
      ? clientIds.map(clientId => clientId) // Just use the client IDs directly
      : [];

    const newResource = {
      title,
      type: 'meeting',
      content: meetingLink,
      description,
      createdAt: new Date(),
      assignedTo
    };

    trainer.resources = trainer.resources || [];
    trainer.resources.push(newResource);
    
    await trainer.save();

    res.status(201).json({ 
      message: 'Meeting link added successfully', 
      resource: newResource 
    });
  } catch (error) {
    console.error("Error in addMeetingResource:", error);
    res.status(500).json({ 
      message: 'Resource creation failed', 
      error: error.message 
    });
  }
});


const getAssignedClients = async (req, res) => {
  try {
    // Get the trainerId from the authenticated user instead of params
    const trainerId = req.trainer.id;
    console.log("Looking for assigned clients for trainer with ID:", trainerId);
    
    if (!mongoose.Types.ObjectId.isValid(trainerId)) {
      return res.status(400).json({ message: "Invalid Trainer ID" });
    }
    
    // Do only one database query with population
    const trainer = await Trainer.findById(trainerId)
      .populate({
        path: "assignedClients",
        select: "name email contact createdAt",
        options: { sort: { createdAt: -1 } } // Sort by newest first
      });
    
    console.log("Found trainer:", trainer ? trainer.name : "None");
    console.log("Populated clients:", trainer && trainer.assignedClients ? trainer.assignedClients.length : "None");
    
    if (!trainer) {
      return res.status(404).json({ message: "Trainer not found" });
    }
    
    // Check if assignedClients exists
    if (!trainer.assignedClients) {
      console.log("No assignedClients array found, initializing empty array");
      trainer.assignedClients = [];
      await trainer.save();
    }
    
    // Check if assignedClients is an array
    if (!Array.isArray(trainer.assignedClients)) {
      console.error("assignedClients is not an array:", trainer.assignedClients);
      return res.status(500).json({ message: "Server error: Invalid data format" });
    }
    
    console.log("Sending clients data:", trainer.assignedClients);
    
    // Return the clients array
    res.json(trainer.assignedClients || []);
  } catch (error) {
    console.error("Error fetching assigned clients:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const connectWithTrainer = asyncHandler(async (req, res) => {
  const { clientId, trainerId } = req.params;

  try {
    const client = await Client.findById(clientId);
    const trainer = await Trainer.findById(trainerId);

    if (!client || !trainer) {
      return res.status(404).json({ message: "Client or Trainer not found" });
    }

    // Check if connection already exists
    const existingConnection = trainer.connectedClients.some(
      conn => conn.client.toString() === clientId
    );

    if (existingConnection) {
      return res.status(400).json({ message: "Client is already connected to this trainer" });
    }

    // Add client to trainer's connected clients
    trainer.connectedClients.push({
      client: clientId,
      connectedAt: new Date()
    });

    // Add trainer to client's connected trainers (if your Client model supports this)
    client.connectedTrainers = client.connectedTrainers || [];
    client.connectedTrainers.push({
      trainer: trainerId,
      connectedAt: new Date()
    });

    await trainer.save();
    await client.save();

    res.status(200).json({ 
      message: "Successfully connected client with trainer",
      connection: {
        clientId,
        trainerId,
        connectedAt: new Date()
      }
    });
  } catch (error) {
    console.error("Connection error:", error);
    res.status(500).json({ message: "Server error during connection", error: error.message });
  }
});

const getAvailableTrainers = asyncHandler(async (req, res) => {
  console.log("Client ID from request:", req.client?.id);
  try {
    // Verify client exists
    const client = await Client.findById(req.client.id);
    if (!client) {
      return res.status(401).json({ message: "Client not found. Please log in again." });
    }

    // Find trainers who are approved and not at max client capacity
    const availableTrainers = await Trainer.find({
      requestStatus: 'Approved',
      // Additional conditions if needed
    }).select('name email contact experience');

    res.status(200).json(availableTrainers);
  } catch (error) {
    console.error("Error fetching available trainers:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all resources for a trainer
const getTrainerResources = async (req, res) => {
  try {
    // Get trainer ID from authentication middleware
    const trainerId = req.trainer.id;
    console.log("Fetching resources for trainer ID:", trainerId);
    
    if (!mongoose.Types.ObjectId.isValid(trainerId)) {
      return res.status(400).json({ message: "Invalid trainer ID" });
    }
    
    const trainer = await Trainer.findById(trainerId);

    if (!trainer) {
      return res.status(404).json({ message: "Trainer not found" });
    }

    // Send resources or empty array if none exists
    res.json(trainer.resources || []);
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get resources assigned to a specific client
const getClientResources = asyncHandler(async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.trainer.id);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    const clientResources = trainer.resources?.filter(resource => 
      resource.assignedTo.some(assignment => 
        assignment.client.toString() === req.params.clientId
      )
    ) || [];

    res.json(clientResources);
  } catch (error) {
    console.error('Error fetching client resources:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});



// Delete a resource
const deleteResource = asyncHandler(async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.trainer.id);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    const resourceIndex = trainer.resources.findIndex(
      resource => resource._id.toString() === req.params.resourceId
    );

    if (resourceIndex === -1) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // If it's a video, delete the file
    const resource = trainer.resources[resourceIndex];
    if (resource.type === 'video' && resource.content.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', resource.content);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Remove the resource from the array
    trainer.resources.splice(resourceIndex, 1);
    await trainer.save();

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = { 
  trainerSignup, 
  trainerLogin, 
  getTrainerById, 
  getTrainerProfile, 
  certificateUpload,
  videoUpload,
  sendTrainerRequest,
  uploadVideoResource,
  addMeetingResource,
  getTrainerResources,
  getClientResources,
  deleteResource,
  connectWithTrainer,
  getAssignedClients,
  getAvailableTrainers
};
