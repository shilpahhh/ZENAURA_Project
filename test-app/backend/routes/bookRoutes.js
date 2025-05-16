const express = require("express");
const multer = require("multer");
const path = require("path");
const Book = require("../models/Book");

const router = express.Router();

// Storage engine for book PDFs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/books/"); // Store books in 'uploads/books/'
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// 📌 Upload a new book (Title, Price, PDF)
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { title, intro } = req.body;
    const fileUrl = `/books/${req.file.filename}`; // PDF file path

    const newBook = new Book({ title, intro, fileUrl });
    await newBook.save();

    res.status(201).json({ message: "Book uploaded successfully!", book: newBook });
  } catch (error) {
    res.status(500).json({ error: "Failed to upload book" });
  }
});

// 📌 Fetch all books
router.get("/", async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// 📌 Download book PDF
router.get("/download/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const filePath = path.join(__dirname, "../uploads", book.fileUrl);
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ error: "Failed to download book" });
  }
});

module.exports = router;
