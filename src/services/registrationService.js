const Opportunity = require('../models/Opportunity');
const Registration = require('../models/Registration');
const ApiError = require('../utils/apiError');

/**
 * Service to handle registration logic:
 * Enforces atomic capacity check, duplicate check, and schedule conflict check, in that order
 */
const registerUserForOpportunity = async (userId, opportunityId) => {
  // Step 1: Verify opportunity exists and is OPEN
  const opportunity = await Opportunity.findById(opportunityId);
  if (!opportunity) {
    throw new ApiError(404, 'NOT_FOUND', 'Opportunity not found');
  }

  if (opportunity.status !== 'OPEN') {
    throw new ApiError(409, 'OPPORTUNITY_NOT_OPEN', `Opportunity is ${opportunity.status}, not accepting registrations`);
  }

  if (new Date(opportunity.dateTime) <= new Date()) {
    throw new ApiError(409, 'OPPORTUNITY_PAST', 'Cannot register for an opportunity that has already occurred');
  }

  // Step 2: Atomic capacity check & reservation
  // Single atomic findOneAndUpdate using $expr to guarantee no race condition
  const reservedOpp = await Opportunity.findOneAndUpdate(
    {
      _id: opportunityId,
      status: 'OPEN',
      $expr: { $lt: ['$registeredCount', '$requiredVolunteers'] }
    },
    { $inc: { registeredCount: 1 } },
    { new: true }
  );

  if (!reservedOpp) {
    throw new ApiError(409, 'CAPACITY_EXCEEDED', 'Opportunity has reached maximum capacity');
  }

  // Step 3: Duplicate active registration check
  const activeReg = await Registration.findOne({
    user: userId,
    opportunity: opportunityId,
    status: 'REGISTERED'
  });

  if (activeReg) {
    // Rollback atomic counter reservation
    await Opportunity.findByIdAndUpdate(opportunityId, { $inc: { registeredCount: -1 } });
    throw new ApiError(
      409,
      'DUPLICATE_REGISTRATION',
      'User already holds an active registration for this opportunity'
    );
  }

  // Step 4: Schedule-conflict check (1-hour buffer window)
  const targetTime = new Date(opportunity.dateTime).getTime();
  const bufferMs = 60 * 60 * 1000; // 1 hour buffer

  const userActiveRegistrations = await Registration.find({
    user: userId,
    opportunity: { $ne: opportunityId },
    status: 'REGISTERED'
  }).populate('opportunity', 'title dateTime');

  for (const reg of userActiveRegistrations) {
    if (reg.opportunity && reg.opportunity.dateTime) {
      const existingTime = new Date(reg.opportunity.dateTime).getTime();
      if (Math.abs(targetTime - existingTime) < bufferMs) {
        // Rollback atomic counter reservation
        await Opportunity.findByIdAndUpdate(opportunityId, { $inc: { registeredCount: -1 } });
        throw new ApiError(
          409,
          'SCHEDULE_CONFLICT',
          `Schedule conflict: You already have an active registration for "${reg.opportunity.title}" within 1 hour of this event`
        );
      }
    }
  }

  // Step 5: Create Registration document
  try {
    const registration = await Registration.create({
      user: userId,
      opportunity: opportunityId,
      status: 'REGISTERED',
      registeredAt: new Date()
    });
    return registration;
  } catch (err) {
    // Rollback atomic counter reservation
    await Opportunity.findByIdAndUpdate(opportunityId, { $inc: { registeredCount: -1 } });
    if (err.code === 11000) {
      throw new ApiError(
        409,
        'DUPLICATE_REGISTRATION',
        'User already holds an active registration for this opportunity'
      );
    }
    throw err;
  }
};

/**
 * Service to handle volunteer withdrawal
 */
const withdrawRegistration = async (userId, registrationId) => {
  const registration = await Registration.findById(registrationId).populate('opportunity');
  if (!registration) {
    throw new ApiError(404, 'NOT_FOUND', 'Registration not found');
  }

  // Must belong to caller
  if (registration.user.toString() !== userId.toString()) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to withdraw this registration');
  }

  // Must be currently active
  if (registration.status !== 'REGISTERED') {
    throw new ApiError(400, 'INELIGIBLE_WITHDRAWAL', 'Registration is not currently active');
  }

  // Check opportunity date is in future
  if (!registration.opportunity) {
    throw new ApiError(404, 'NOT_FOUND', 'Associated opportunity not found');
  }

  if (new Date(registration.opportunity.dateTime) <= new Date()) {
    throw new ApiError(
      400,
      'INELIGIBLE_WITHDRAWAL',
      'Cannot withdraw: The opportunity date and time has already passed'
    );
  }

  if (['COMPLETED', 'CANCELLED'].includes(registration.opportunity.status)) {
    throw new ApiError(
      400,
      'INELIGIBLE_WITHDRAWAL',
      `Cannot withdraw: Opportunity is ${registration.opportunity.status}`
    );
  }

  // Atomically decrement registeredCount (floor at 0)
  await Opportunity.findOneAndUpdate(
    { _id: registration.opportunity._id, registeredCount: { $gt: 0 } },
    { $inc: { registeredCount: -1 } }
  );

  registration.status = 'WITHDRAWN';
  registration.withdrawnAt = new Date();
  await registration.save();

  return registration;
};

module.exports = {
  registerUserForOpportunity,
  withdrawRegistration
};
