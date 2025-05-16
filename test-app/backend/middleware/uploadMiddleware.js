const multer = require("multer");
const path = require("path");

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine the destination based on file type
    let uploadPath = "uploads/";
    if (file.mimetype.startsWith("audio/")) {
      uploadPath += "podcasts/";
    } else if (file.mimetype === "application/pdf") {
      uploadPath += "books/";
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept audio files for podcasts and PDFs for books
  if (file.mimetype.startsWith("audio/") || file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only audio files and PDFs are allowed."), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

module.exports = upload; 
