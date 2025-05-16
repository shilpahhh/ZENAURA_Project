const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const Trainer = require("../models/Trainer");
const Resource = require("../models/Resource");
const { clientSignup, 
  clientLogin,
   getClientProfile,
    getTrainerForClient, 
    connectWithTrainer,
         } = require("../controllers/clientController");
const { protectClient } = require("../middleware/authMiddleware");

// Routes
router.post("/signup", clientSignup); 
router.post("/login", clientLogin);
router.get("/profile/:id", protectClient, getClientProfile);
router.get("/trainer/:clientId", protectClient, getTrainerForClient);
router.get("/resources", protectClient, async (req, res, next) => {
  try {
    if (!req.client || !req.client.id) {
      return res.status(401).json({ message: "Unauthorized access" });
    }
    
    const clientId = req.client.id;
    console.log('Authenticated Client ID:', clientId);

    // Find all trainers and get resources assigned to this client
    const trainers = await Trainer.find({
      'resources.assignedTo': clientId
    }).select('name resources');

    // Extract and format resources
    const clientResources = trainers.flatMap(trainer => 
      trainer.resources
        .filter(resource => 
          resource.assignedTo.some(client => 
            client.toString() === clientId
          )
        )
        .map(resource => ({
          ...resource.toObject(),
          trainer: {
            _id: trainer._id,
            name: trainer.name
          }
        }))
    );

    console.log('Found Resources:', clientResources.length);
    res.json(clientResources);
  } catch (err) {
    console.error('Resource Fetching Error:', err);
    next(err);
  }
});

// Assign Trainer to Client - Fetch Assigned Trainer
router.get("/:clientId/assign-trainer", async (req, res) => {
  const { clientId } = req.params;

  try {
    const client = await Client.findById(clientId).select("currentTrainer");
    console.log("Fetched Client:", client); // Debugging

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (!client.currentTrainer.trainerId) {
      console.log("Trainer not assigned to this client.");
      return res.json({ message: "No trainer assigned yet" });
    }

    const trainer = await Trainer.findById(client.currentTrainer.trainerId)
      .select("name email contact experience certificate");
    console.log("Fetched Trainer:", trainer); // Debugging

    res.json({ trainer });
  } catch (error) {
    console.error("Error fetching trainer:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// GET available trainers
router.get("/available-trainers", protectClient, async (req, res) => {

 

  try {
    const trainers = await Trainer.find({
      requestStatus: "Approved",
      isApproved: true,
      isAvailable: true
    }).select("name email contact experience certificate");
    console.log("Trainers Sent to Frontend:", trainers);


    if (trainers.length === 0) {
      return res.json({ message: "No trainers available" });
    }
    res.json({ trainers });
  } catch (error) {
    console.error("Error fetching trainers:", error);
    res.status(500).json({ message: "Server error" });
  }
});

  router.put("/connect-trainer/:clientId/:trainerId", protectClient, connectWithTrainer);


  router.get("/test", (req, res) => {
    res.json({ message: "✅ Test Route Works!" });
  });


module.exports = router;
