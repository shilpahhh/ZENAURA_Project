const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


// Define the schema for the trainer
const trainerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contact: { type: String, required: true },
  experience: { type: String, required: true },
  certificate: { type: String, required: true }, // Store file path
  requestStatus: { type: String, enum: ['Not Sent', 'Pending', 'Approved', 'Rejected'], default: 'Not Sent' },
  isApproved: { type: Boolean, default: false }, 

  isAvailable: { type: Boolean, default: true },
  maxClientCapacity: { type: Number, default: 10 },
  currentClientCount: { type: Number, default: 0 },

  // Resources (videos, meetings)
  resources: [{
    title: { type: String, required: true },
    type: { type: String, enum: ['video', 'meeting'], required: true },
    content: { type: String, required: true }, // URL or file path
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Client' 
    }]
  }],
  connections: [{
    clientId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Client',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    connectedAt: {
      type: Date,
      default: Date.now
    }
  }],


  // Clients assigned to the trainer
  assignedClients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }]

}, { timestamps: true });

// Middleware: Update availability based on client count
trainerSchema.pre('save', function (next) {
  this.isAvailable = this.currentClientCount < this.maxClientCapacity;
  next();
});
trainerSchema.pre('save', function(next) {
  // If request status is Approved, ensure isApproved is true
  if (this.requestStatus === 'Approved') {
    this.isApproved = true;
  }
  next();
});

// Explicitly define the collection name as 'trainers'
const Trainer = mongoose.models.Trainer || mongoose.model('Trainer', trainerSchema, 'trainers');

module.exports = Trainer;
