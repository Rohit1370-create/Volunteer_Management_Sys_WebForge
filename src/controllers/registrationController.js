const Registration = require('../models/Registration');
const { withdrawRegistration } = require('../services/registrationService');
const { sendSuccess } = require('../utils/responseEnvelope');

/**
 * @desc    Withdraw from an eligible registration (Owner only)
 * @route   PATCH /api/v1/registrations/:id/withdraw
 * @access  Owner only
 */
const withdraw = async (req, res, next) => {
  try {
    const registration = await withdrawRegistration(req.user._id, req.params.id);
    return sendSuccess(res, 200, registration, 'Successfully withdrawn from opportunity');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    View caller's own participation history
 * @route   GET /api/v1/registrations/me
 * @access  Protected
 */
const getMyRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({ user: req.user._id })
      .populate({
        path: 'opportunity',
        populate: [
          { path: 'club', select: 'name' },
          { path: 'event', select: 'name' }
        ]
      })
      .sort({ registeredAt: -1 });

    return sendSuccess(res, 200, registrations);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  withdraw,
  getMyRegistrations
};
