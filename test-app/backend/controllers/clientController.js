const mongoose = require('mongoose');
const Client = require("../models/Client");
const Trainer = require("../models/Trainer"); 
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");

// Client Signup
const clientSignup = async (req, res) => {
  const { name, email, password, trainerId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const existingClient = await Client.findOne({ email });
  if (existingClient) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const trainerName = trainerId ? (await Trainer.findById(trainerId))?.name || "Not Assigned" : "Not Assigned";

  const newClient = new Client({
    name,
    email,
    password,
    trainerId: trainerId || null,
    trainerName
  });

  await newClient.save();

  res.status(201).json({
    success: true,
    message: "Signup successful",
    clientId: newClient._id,
    name: newClient.name,
    email: newClient.email,
    trainerName: newClient.trainerName
  });
};

// Client Login
const clientLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const client = await Client.findOne({ email });
    if (!client) {
      return res.status(401).json({ message: "Client not found" });
    }
    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: client._id },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "50d" }
    );
    res.status(200).json({
      id: client._id,  // Consistent key name
      name: client.name,
      email: client.email,
      token: token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Client Profile

const getClientProfile = async (req, res) => {
  try {
    // Use the ID from the route parameter or from the authenticated client
    const clientId = req.params.id || req.client._id;

    console.log("Fetching profile for clientId:", clientId);

    if (!clientId) {
      return res.status(400).json({ 
        message: "Client ID is required" 
      });
    }

    const client = await Client.findById(clientId).select("-password");

    if (!client) {
      return res.status(404).json({ 
        message: "Client not found" 
      });
    }

    const profileResponse = {
      id: client._id,
      name: client.name,
      email: client.email,
      currentTrainer: client.currentTrainer || null
    };

    res.status(200).json(profileResponse);
  } catch (error) {
    console.error("Detailed Profile Fetch Error:", {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({ 
      message: "Server error fetching profile",
      error: error.message 
    });
  }
};


// Connect with Trainer
const connectWithTrainer = async (req, res) => {
  try {
    const { clientId, trainerId } = req.params;
    
    console.log(`Backend connecting client ${clientId} with trainer ${trainerId}`);

    // Validate input
    if (!clientId || !trainerId) {
      return res.status(400).json({
        success: false,
        message: "Client and Trainer IDs are required"
      });
    }
    
    // Verify that IDs are valid MongoDB ObjectIDs
    if (!mongoose.Types.ObjectId.isValid(clientId) || !mongoose.Types.ObjectId.isValid(trainerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client or trainer ID format"
      });
    }

    // Fetch client and trainer
    const [client, trainer] = await Promise.all([
      Client.findById(clientId),
      Trainer.findById(trainerId)
    ]);

    console.log(`Client found: ${!!client}, Trainer found: ${!!trainer}`);
    
    if (!client || !trainer) {
      return res.status(404).json({
        success: false,
        message: `${!client ? 'Client' : 'Trainer'} not found`
      });
    }

    // Check trainer capacity
    if (trainer.currentClientCount >= trainer.maxClientCapacity) {
      return res.status(400).json({
        success: false,
        message: "Trainer has reached maximum client capacity"
      });
    }

    // Check if client already has a current trainer
    if (client.currentTrainer && client.currentTrainer.trainerId) {
      // If the client is trying to connect with the same trainer, just return success
      if (client.currentTrainer.trainerId.toString() === trainerId) {
        return res.status(200).json({
          success: true,
          message: "Already connected with this trainer",
          currentTrainer: client.currentTrainer
        });
      }
      
      return res.status(400).json({
        success: false,
        message: "Client is already connected with a trainer",
        currentTrainer: client.currentTrainer
      });
    }

    // Check if connection already exists in the history
    const existingConnection = client.connectedTrainers && client.connectedTrainers.find(
      conn => conn.trainer && conn.trainer.toString() === trainerId
    );
    
    if (existingConnection && existingConnection.connectionStatus === 'Connected') {
      // Update the connection status if it's reconnecting
      existingConnection.connectionStatus = 'Connected';
      existingConnection.connectedAt = new Date();
    } else {
      // Create new connection
      const newClientConnection = {
        trainer: trainerId,
        connectedAt: new Date(),
        connectionStatus: 'Connected'
      };
      
      // Initialize arrays if they don't exist
      if (!client.connectedTrainers) client.connectedTrainers = [];
      client.connectedTrainers.push(newClientConnection);
    }

    // Set current trainer
    client.currentTrainer = {
      trainerId: trainerId,
      trainerName: trainer.name,
      assignedAt: new Date()
    };

    // Update trainer
    const newTrainerConnection = {
      clientId: clientId,
      status: 'approved',
      connectedAt: new Date()
    };
    
    // Initialize arrays if they don't exist
    if (!trainer.connections) trainer.connections = [];
    if (!trainer.assignedClients) trainer.assignedClients = [];
    
    trainer.connections.push(newTrainerConnection);
    
    // Check if client already exists in assignedClients
    if (!trainer.assignedClients.includes(clientId)) {
      trainer.assignedClients.push(clientId);
      trainer.currentClientCount = (trainer.currentClientCount || 0) + 1;
    }

    console.log("Saving client and trainer updates...");
    
    // Save client first
    await client.save();
    
    // Then save trainer
    await trainer.save();
    
    console.log("Connection successful!");
    
    res.status(200).json({
      success: true,
      message: "Successfully connected with trainer",
      connection: {
        clientId: clientId,
        trainerId: trainerId,
        trainerName: trainer.name,
        assignedAt: new Date()
      }
    });
  } catch (error) {
    console.error("Connection Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error processing connection",
      details: error.message
    });
  }
};

const getTrainerForClient = asyncHandler(async (req, res) => {
  try {
    const clientId = req.params.clientId;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }

    const client = await Client.findById(clientId).select("currentTrainer");
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json({
      trainerId: client.currentTrainer?.trainerId || null,
      trainerName: client.currentTrainer?.trainerName || "No trainer assigned yet",
      assignedAt: client.currentTrainer?.assignedAt || null
    });
  } catch (error) {
    console.error("Error fetching trainer:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Fetch Available Trainers
const getAvailableTrainers = asyncHandler(async (req, res) => {
  try {
    console.log("Fetching the most recent available trainer...");

    const availableTrainer = await Trainer.find({
      isAvailable: true,
      requestStatus: "Approved",
      currentClientCount: { $lt: 10 }
    }).sort({ createdAt: -1 }).limit(1); // Get only 1 latest trainer

    if (!availableTrainer.length) {
      console.log("No available trainers found.");
      return res.status(404).json({ message: "No available trainers found." });
    }

    console.log("Trainer Found:", availableTrainer[0]);
    res.status(200).json({ trainer: availableTrainer[0] });
  } catch (error) {
    console.error("Error fetching trainer:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// Assign Trainer
const assignTrainer = asyncHandler(async (req, res) => {
  try {
    const clientId = req.params.clientId;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const availableTrainer = await Trainer.findOne({
      requestStatus: "Approved",
      isAvailable: true,
      currentClientCount: { $lt: 10 }
    });

    if (!availableTrainer) {
      return res.status(404).json({ message: "No trainers available" });
    }

    // Use the setTrainer method from the Client model
    await client.setTrainer(availableTrainer._id);

    availableTrainer.currentClientCount += 1;
    availableTrainer.assignedClients.push(clientId);
    await availableTrainer.save();

    res.status(200).json({
      success: true,
      message: `Trainer ${availableTrainer.name} assigned to client ${client.name}`,
      trainer: availableTrainer
    });
  } catch (error) {
    console.error("Error in Trainer Assignment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// Export Controllers
module.exports = {
  clientSignup,
  clientLogin,
  getClientProfile,
  getTrainerForClient,
  connectWithTrainer,
  getAvailableTrainers,
  assignTrainer, // Added missing export
};




 /*// Optional: Transform certificate path to full URL
    const trainersWithFullCertificateUrl = availableTrainers.map(trainer => {
      const trainerObj = trainer.toObject();
      if (trainerObj.certificate) {
        trainerObj.certificateUrl = `http://localhost:5000/uploads/certificates/${trainerObj.certificate}`;
      }
      return trainerObj;
    });*/



  
    /*
const getTrainerForClient = async (req, res) => {
  try {
    const clientId = req.params.clientId;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json({ trainerName: client.trainerName || "Not Assigned" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Fetch Available Trainers
const getAvailableTrainers = asyncHandler(async (req, res) => {
  try {
    if (!req.client || !req.client.id) {
      return res.status(401).json({ message: "Client not found. Please log in again." });
    }

    const client = await Client.findById(req.client.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found in DB" });
    }

    const availableTrainers = await Trainer.find({ requestStatus: "Approved" }).select(
      "name email contact experience certificate"
    );

    res.status(200).json(availableTrainers);
  } catch (error) {
    console.error("Error fetching trainers:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Assign Trainer
const assignTrainer = async (req, res) => {
  try {
    const clientId = req.params.clientId;
 
    // Validate client ID
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
 
    // Detailed logging
    console.log("Assigning trainer for client:", clientId);
 
    // Find client
    const client = await Client.findById(clientId);
    if (!client) {
      console.error(Client not found with ID: ${clientId});
      return res.status(404).json({ message: "Client not found" });
    }
 
    // Find available trainer with more detailed conditions
    const availableTrainer = await Trainer.findOne({
      requestStatus: "Approved",
      isApproved: true,
      isAvailable: true,
      currentClientCount: { $lt: 10 }
    });
 
    // More detailed logging
    if (!availableTrainer) {
      console.error("No available trainers found with current conditions");
      
      // Log all trainers to understand why
      const allTrainers = await Trainer.find({}, 'name requestStatus isApproved isAvailable currentClientCount');
      console.log("All Trainers:", allTrainers);
 
      return res.status(404).json({ 
        message: "No trainers available", 
        trainerDetails: allTrainers 
      });
    }
 
    // Assign trainer to client
    client.trainerId = availableTrainer._id;
    client.trainerName = availableTrainer.name;
    await client.save();
 
    // Update trainer's client count
    availableTrainer.currentClientCount += 1;
    availableTrainer.assignedClients.push(clientId);
    await availableTrainer.save();
 
    console.log(Trainer ${availableTrainer._id} assigned to client ${clientId});
    res.json({ trainer: availableTrainer });
 
  } catch (error) {
    // Comprehensive error logging
    console.error("Detailed Error in Trainer Assignment:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
 
    res.status(500).json({
      message: "Server error during trainer assignment",
      errorDetails: error.message
    });
  }
 };
trainer controller
    */
