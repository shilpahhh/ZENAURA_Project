const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6
  },
  currentTrainer: {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      default: null
    },
    trainerName: {
      type: String,
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    }
  },
  connectedTrainers: [{
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer'
    },
    connectedAt: {
      type: Date,
      default: Date.now
    },
    connectionStatus: {
      type: String,
      enum: ['Pending', 'Connected', 'Disconnected'],
      default: 'Pending'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});




// Hash password before saving
clientSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

clientSchema.methods.setTrainer = async function(trainerId) {
  const Trainer = mongoose.model("Trainer");
  const trainer = await Trainer.findById(trainerId);
  
  if (trainer) {
    console.log("Trainer Found:", trainer); // Debugging line

    this.currentTrainer = {
      trainerId: trainer._id,
      trainerName: trainer.name,
      assignedAt: new Date()
    };

    this.markModified("currentTrainer"); // Ensure Mongoose detects the change
    await this.save(); // Save the updated client document
  }
};

const Client = mongoose.models.Client || mongoose.model('Client', clientSchema, 'clients');
module.exports = Client;
