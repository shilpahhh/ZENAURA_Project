/*const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/mydb", {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    console.error("📌 Full Error Details:", error);
    // Don't exit the process during development - it will crash your server
    // process.exit(1); 
  }
};

module.exports = connectDB;*/
