const mongoose = require("mongoose");

const ContentSchema = new mongoose.Schema({
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: "Trainer", required: true },
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ["video", "audio", "document"], required: true },
  fileUrl: { type: String, required: true }, // URL to the uploaded content
  createdAt: { type: Date, default: Date.now }
});

const Content = mongoose.model("Content", ContentSchema);
module.exports = Content;
