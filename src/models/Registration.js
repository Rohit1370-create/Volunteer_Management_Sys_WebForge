const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Registration must be linked to a user']
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: [true, 'Registration must be linked to an opportunity']
    },
    status: {
      type: String,
      enum: {
        values: ['REGISTERED', 'WITHDRAWN', 'ATTENDED', 'ABSENT'],
        message: 'Status must be REGISTERED, WITHDRAWN, ATTENDED, or ABSENT'
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
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound unique index ensuring a user cannot have duplicate registrations for the same opportunity
registrationSchema.index({ user: 1, opportunity: 1 }, { unique: true });

const Registration = mongoose.model('Registration', registrationSchema);

module.exports = Registration;
