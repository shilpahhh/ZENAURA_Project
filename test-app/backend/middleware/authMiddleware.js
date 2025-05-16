// authMiddleware.js for clients
const jwt = require("jsonwebtoken");
const Client = require("../models/Client");

const protectClient = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      console.log("Received Token:", token);

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
      console.log("Decoded Token:", decoded);

      req.client = await Client.findById(decoded.id).select("-password");
      console.log("Client Found:", req.client);

      if (!req.client) {
        return res.status(401).json({ message: "Client not found. Unauthorized" });
      }

      next();
    } catch (error) {
      console.error("Token Verification Error:", error);
      return res.status(401).json({ message: "Invalid token, authorization denied" });
    }
  } else {
    return res.status(401).json({ message: "No token provided" });
  }
};

// Admin verification middleware
const verifyToken = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      
      // Check for fixed admin token
      if (token === "admin-token") {
        next();
        return;
      }
      
      // If not fixed token, verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecretkey");
      if (!decoded.id) {
        return res.status(401).json({ message: "Invalid token" });
      }
      
      next();
    } catch (error) {
      console.error("Token Verification Error:", error);
      return res.status(401).json({ message: "Invalid token, authorization denied" });
    }
  } else {
    return res.status(401).json({ message: "No token provided" });
  }
};

module.exports = { protectClient, verifyToken };







/*const authMiddleware = (req, res, next) => {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("JWT Error:", error.message);
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }
        res.status(401).json({ message: "Token is not valid" });
    }
};

module.exports = authMiddleware;*/
