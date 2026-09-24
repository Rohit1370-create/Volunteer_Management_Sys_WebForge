const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required']
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: [true, 'Opportunity is required']
    },
    status: {
      type: String,
      enum: {
        values: ['REGISTERED', 'WITHDRAWN'],
        message: 'Status must be REGISTERED or WITHDRAWN'
      },
      default: 'REGISTERED'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    withdrawnAt: {
      type: Date,
      default: null
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

// Partial unique index enforcing at most one active (REGISTERED) registration per user per opportunity
// Allows multiple past WITHDRAWN rows without index collisions
registrationSchema.index(
  { user: 1, opportunity: 1 },
  { unique: true, partialFilterExpression: { status: 'REGISTERED' } }
);

const Registration = mongoose.model('Registration', registrationSchema);

module.exports = Registration;
