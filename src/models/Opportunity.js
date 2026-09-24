const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Opportunity title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      default: null
    },
    dateTime: {
      type: Date,
      required: [true, 'dateTime is required']
    },
    location: {
      type: String,
      required: [true, 'location is required'],
      trim: true
    },
    requiredVolunteers: {
      type: Number,
      required: [true, 'requiredVolunteers is required'],
      min: [1, 'requiredVolunteers must be at least 1']
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: [0, 'registeredCount cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ['OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED'],
        message: 'Status must be OPEN, CLOSED, CANCELLED, or COMPLETED'
      },
      default: 'OPEN'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

opportunitySchema.index({ status: 1 });
opportunitySchema.index({ dateTime: 1 });
opportunitySchema.index({ club: 1 });
opportunitySchema.index({ event: 1 });

const Opportunity = mongoose.model('Opportunity', opportunitySchema);

module.exports = Opportunity;
