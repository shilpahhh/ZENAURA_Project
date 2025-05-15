const Admin = require("../models/Admin");
const Client = require("../models/Client");
const Book = require("../models/Book");
const Podcast = require("../models/Podcast");
const Trainer = require("../models/Trainer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Admin login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || "mysecretkey", {
      expiresIn: "1d",
    });

    res.json({ token, isAdmin: true });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all clients
const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find().select("-password");
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Book management
const uploadBook = async (req, res) => {
  try {
    const { title, intro } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Please upload a file" });
    }

    const book = new Book({
      title,
      intro,
      file: file.path,
    });

    await book.save();
    res.status(201).json(book);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Podcast management
const uploadPodcast = async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Please upload a file" });
    }

    const podcast = new Podcast({
      title,
      description,
      file: file.path,
    });

    await podcast.save();
    res.status(201).json(podcast);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const getAllPodcasts = async (req, res) => {
  try {
    const podcasts = await Podcast.find().sort({ createdAt: -1 });
    res.json(podcasts);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const deletePodcast = async (req, res) => {
  try {
    const podcast = await Podcast.findByIdAndDelete(req.params.id);
    if (!podcast) {
      return res.status(404).json({ message: "Podcast not found" });
    }
    res.json({ message: "Podcast deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Trainer request management
const getTrainerRequests = async (req, res) => {
  try {
    // Fetch all trainers regardless of request status
    const trainers = await Trainer.find({})
      .select('name email contact experience certificate requestStatus isApproved')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${trainers.length} trainers`);
    res.json(trainers);
  } catch (error) {
    console.error("Error fetching trainer requests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const approveTrainerRequest = async (req, res) => {
  try {
    const trainer = await Trainer.findByIdAndUpdate(
      req.params.id,
      { 
        requestStatus: 'Approved',
        isApproved: true
      },
      { new: true }
    );
    if (!trainer) {
      return res.status(404).json({ message: "Trainer not found" });
    }
    res.json(trainer);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const rejectTrainerRequest = async (req, res) => {
  try {
    const trainer = await Trainer.findByIdAndUpdate(
      req.params.id,
      { 
        requestStatus: 'Rejected',
        isApproved: false
      },
      { new: true }
    );
    if (!trainer) {
      return res.status(404).json({ message: "Trainer not found" });
    }
    res.json(trainer);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { 
  adminLogin, 
  getAllClients, 
  uploadBook, 
  getAllBooks, 
  deleteBook, 
  uploadPodcast, 
  getAllPodcasts, 
  deletePodcast, 
  getTrainerRequests, 
  approveTrainerRequest, 
  rejectTrainerRequest 
};
