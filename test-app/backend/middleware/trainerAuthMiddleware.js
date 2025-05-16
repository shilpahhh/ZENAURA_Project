const jwt = require("jsonwebtoken");
const Trainer = require("../models/Trainer");

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1]; // Extract token
      console.log("Token received:", token.substring(0, 10) + "...");
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
      console.log("Decoded token:", decoded);

      req.trainer = await Trainer.findById(decoded.id).select("-password");
      console.log("Trainer found:", req.trainer ? req.trainer.name : "None");
      console.log("Trainer ID:", req.trainer ? req.trainer._id : "None");
      
      if (!req.trainer) {
        console.log("Trainer not found in database");
        return res.status(401).json({ message: "Unauthorized: Trainer not found" });
      }

      next();
    } catch (error) {
      console.error("Auth error:", error);

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Unauthorized: Token expired" });
      }

      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
  } else {
    console.log("No token provided in request");
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }
};

module.exports = { protect };
