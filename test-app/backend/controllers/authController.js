const Client = require("../models/Client");
const Trainer = require("../models/Trainer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET || "mysecretkey"; // Store in .env file

// User Registration (Client & Trainer)
const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    // Check if user already exists
    const existingUser = await (role === "trainer" ? Trainer : Client).findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists!" });
    }

    // Create new user (passwords are hashed in the pre-save hook of each model)
    if (role === "trainer") {
      const { certificate, contact } = req.body;
      if (!certificate || !contact) {
        return res.status(400).json({ message: "Certificate and contact are required for trainers" });
      }
      
      const newTrainer = new Trainer({
        name,
        email,
        password,
        certificate,
        contact,
        scheduledClasses: [],
        uploadedVideos: []
      });
      
      await newTrainer.save();
    } else {
      // Client registration
      const newClient = new Client({
        name,
        email,
        password
      });
      
      await newClient.save();
    }

    res.status(201).json({ message: "Signup successful! Redirecting to login..." });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Error creating user! Please try again later." });
  }
};

// User Login (Client & Trainer)
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check if user exists in the database
    const user = await Client.findOne({ email }) || await Trainer.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Login failed" }); // Avoid revealing if email exists
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Login failed" });
    }

    // Determine role
    const role = user.constructor.modelName === 'Trainer' ? 'trainer' : 'client';

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role },
      SECRET_KEY,
      { expiresIn: "2h" }
    );

    res.status(200).json({ 
      message: "Login successful", 
      token, 
      role,
      userId: user._id,
      name: user.name
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Login failed! Please try again later." });
  }
};

// Dedicated Trainer Signup
const trainerSignup = async (req, res) => {
  try {
    const { name, email, password, certificate, contact } = req.body;
    
    // Check if trainer already exists
    const existingTrainer = await Trainer.findOne({ email });
    if (existingTrainer) {
      return res.status(400).json({ message: "Trainer already exists with this email" });
    }
    
    // Create new trainer (password will be hashed by the pre-save hook)
    const newTrainer = new Trainer({
      name,
      email,
      password,
      certificate,
      contact,
      scheduledClasses: [],
      uploadedVideos: []
    });
    
    // Save trainer to database
    await newTrainer.save();
    
    res.status(201).json({ 
      message: "Trainer registered successfully",
      trainer: {
        id: newTrainer._id,
        name: newTrainer.name,
        email: newTrainer.email
      }
    });
  } catch (error) {
    console.error("Error in trainer signup:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { registerUser, loginUser, trainerSignup };
