const Registration = require('../models/Registration');
const Opportunity = require('../models/Opportunity');

/**
 * @desc    Withdraw from an opportunity (USER, own record only, eligibility checks §9)
 * @route   PATCH /api/registrations/:id/withdraw
 * @access  Private (USER)
 */
const withdrawRegistration = async (req, res, next) => {
  try {
    const registrationId = req.params.id;
    const userId = req.user._id;

    // Step 1: Load registration; must belong to req.user
    const registration = await Registration.findById(registrationId);
    if (!registration || registration.user.toString() !== userId.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Step 2: Must be currently REGISTERED
    if (registration.status !== 'REGISTERED') {
      return res.status(400).json({
        success: false,
        message: 'Not currently registered'
      });
    }

    // Step 3: Load opportunity and check eligibility
    const opportunity = await Opportunity.findById(registration.opportunity);
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Associated opportunity not found'
      });
    }

    if (['COMPLETED', 'CANCELLED'].includes(opportunity.status)) {
      return res.status(400).json({
        success: false,
        message: 'Not eligible to withdraw: Opportunity is already completed or cancelled'
      });
    }

    if (new Date(opportunity.dateTime) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Not eligible to withdraw: Opportunity date has already passed'
      });
    }

    // Step 4: Atomically decrement Opportunity.registeredCount (floor at 0)
    await Opportunity.findOneAndUpdate(
      { _id: opportunity._id, registeredCount: { $gt: 0 } },
      { $inc: { registeredCount: -1 } }
    );

    // Step 5: Update registration status and withdrawn timestamp
    registration.status = 'WITHDRAWN';
    registration.withdrawnAt = new Date();
    await registration.save();

    // Step 6: Return success
    res.status(200).json({
      success: true,
      message: 'Successfully withdrawn from opportunity',
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    View own participation history
 * @route   GET /api/registrations/me
 * @access  Private (USER)
 */
const getMyRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({ user: req.user._id })
      .populate('opportunity')
      .sort({ registeredAt: -1 });

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    View and filter all registrations
 * @route   GET /api/registrations
 * @access  Private (ADMIN)
 */
const getAllRegistrations = async (req, res, next) => {
  try {
    const { opportunity, user, status, page = 1, limit = 10 } = req.query;

    const query = {};
    if (opportunity) query.opportunity = opportunity;
    if (user) query.user = user;
    if (status) query.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Registration.countDocuments(query);
    const registrations = await Registration.find(query)
      .populate('user', 'name email role')
      .populate('opportunity', 'title dateTime location status requiredVolunteers registeredCount')
      .sort({ registeredAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: registrations.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: registrations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set a registration's outcome (ATTENDED / ABSENT / WITHDRAWN)
 * @route   PATCH /api/registrations/:id/status
 * @access  Private (ADMIN)
 */
const updateRegistrationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (['ATTENDED', 'ABSENT'].includes(status)) {
      if (registration.status !== 'REGISTERED') {
        return res.status(400).json({
          success: false,
          message: 'Participation outcome can only be recorded for currently registered volunteers'
        });
      }
      registration.status = status;
    } else if (status === 'WITHDRAWN') {
      // If registration was currently REGISTERED, decrement opportunity registeredCount
      if (registration.status === 'REGISTERED') {
        await Opportunity.findOneAndUpdate(
          { _id: registration.opportunity, registeredCount: { $gt: 0 } },
          { $inc: { registeredCount: -1 } }
        );
      }
      registration.status = 'WITHDRAWN';
      registration.withdrawnAt = new Date();
    }

    await registration.save();

    res.status(200).json({
      success: true,
      message: `Registration status updated to ${status}`,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  withdrawRegistration,
  getMyRegistrations,
  getAllRegistrations,
  updateRegistrationStatus
};
