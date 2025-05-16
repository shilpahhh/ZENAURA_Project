const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: "Trainer", required: true },
  plan: { type: String, required: true }, // Example: "Basic", "Premium"
  paymentStatus: { type: String, enum: ["Pending", "Completed"], default: "Pending" },
  scheduleLink: { type: String, default: "" }, // Google Meet or Zoom link
  videos: [{ type: String }], // Array of uploaded video URLs
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model("Booking", BookingSchema);
module.exports = Booking;
