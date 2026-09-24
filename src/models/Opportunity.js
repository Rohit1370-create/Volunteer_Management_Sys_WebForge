const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an opportunity title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      trim: true
    },
    dateTime: {
      type: Date,
      required: [true, 'Please provide a date and time for the opportunity']
    },
    location: {
      type: String,
      required: [true, 'Please provide a location'],
      trim: true
    },
    requiredVolunteers: {
      type: Number,
      required: [true, 'Please specify the number of required volunteers'],
      min: [1, 'Required volunteers must be at least 1']
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: [0, 'Registered count cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ['OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED'],
        message: 'Status must be OPEN, CLOSED, COMPLETED, or CANCELLED'
      },
      default: 'OPEN'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Opportunity must belong to a creator']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for fast lookup and filtering
opportunitySchema.index({ status: 1 });
opportunitySchema.index({ dateTime: 1 });
opportunitySchema.index({ location: 1 });

const Opportunity = mongoose.model('Opportunity', opportunitySchema);

module.exports = Opportunity;
