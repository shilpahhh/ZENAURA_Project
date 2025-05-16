const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Resource title
  description: { type: String, required: true }, // Short description
  type: { type: String, enum: ["video", "meeting"], required: true }, // Type of resource
  videoUrl: { type: String }, // Video URL (if type is "video")
  meetingLink: { type: String }, // Meeting link (if type is "meeting")
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: "Trainer", required: true }, // Trainer who uploaded it
  clients: [{ type: mongoose.Schema.Types.ObjectId, ref: "Client" }], // Clients who can access this
  createdAt: { type: Date, default: Date.now } // Timestamp
});

const Resource = mongoose.models.Resource || mongoose.model("Resource", resourceSchema, 'resources');
module.exports = Resource;
