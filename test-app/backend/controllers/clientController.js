const Book = require("../models/Book");

// Fetch all books
const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find();
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: "Error fetching books" });
  }
};

// Add a new book
const addBook = async (req, res) => {
  const { title, intro, fileUrl, link } = req.body;

  try {
    const newBook = new Book({ title, intro, fileUrl, link });
    await newBook.save();
    res.status(201).json({ message: "Book added successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error adding book" });
  }
};

module.exports = { getAllBooks, addBook };
