const Opportunity = require('../models/Opportunity');
const Registration = require('../models/Registration');

/**
 * @desc    Get all opportunities with optional filters and pagination
 * @route   GET /api/opportunities
 * @access  Private (USER, ADMIN)
 */
const getOpportunities = async (req, res, next) => {
  try {
    const { status, location, upcoming, page = 1, limit = 10 } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (upcoming === 'true') {
      query.dateTime = { $gt: new Date() };
    } else if (upcoming === 'false') {
      query.dateTime = { $lte: new Date() };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Opportunity.countDocuments(query);
    const opportunities = await Opportunity.find(query)
      .populate('createdBy', 'name email')
      .sort({ dateTime: 1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: opportunities.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: opportunities
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single opportunity by ID
 * @route   GET /api/opportunities/:id
 * @access  Private (USER, ADMIN)
 */
const getOpportunity = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id).populate('createdBy', 'name email');

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    res.status(200).json({
      success: true,
      data: opportunity
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new opportunity
 * @route   POST /api/opportunities
 * @access  Private (ADMIN)
 */
const createOpportunity = async (req, res, next) => {
  try {
    const { title, description, dateTime, location, requiredVolunteers } = req.body;

    // Check dateTime is in future
    if (new Date(dateTime) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'dateTime must be in the future'
      });
    }

    const opportunity = await Opportunity.create({
      title,
      description,
      dateTime,
      location,
      requiredVolunteers,
      registeredCount: 0,
      status: 'OPEN',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Opportunity created successfully',
      data: opportunity
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update opportunity details (excluding status)
 * @route   PATCH /api/opportunities/:id
 * @access  Private (ADMIN)
 */
const updateOpportunity = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    const { title, description, dateTime, location, requiredVolunteers } = req.body;

    if (title !== undefined) opportunity.title = title;
    if (description !== undefined) opportunity.description = description;
    if (dateTime !== undefined) {
      opportunity.dateTime = dateTime;
    }
    if (location !== undefined) opportunity.location = location;

    if (requiredVolunteers !== undefined) {
      if (requiredVolunteers < opportunity.registeredCount) {
        return res.status(400).json({
          success: false,
          message: `Cannot set requiredVolunteers (${requiredVolunteers}) below currently registered count (${opportunity.registeredCount})`
        });
      }
      opportunity.requiredVolunteers = requiredVolunteers;
    }

    await opportunity.save();

    res.status(200).json({
      success: true,
      message: 'Opportunity updated successfully',
      data: opportunity
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update opportunity status (OPEN, CLOSED, COMPLETED, CANCELLED)
 * @route   PATCH /api/opportunities/:id/status
 * @access  Private (ADMIN)
 */
const updateOpportunityStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    opportunity.status = status;

    // Admin Status Management (§10):
    // If status is CANCELLED: reset registeredCount to 0 and cascade bulk-set REGISTERED to WITHDRAWN
    if (status === 'CANCELLED') {
      opportunity.registeredCount = 0;
      await Registration.updateMany(
        { opportunity: opportunity._id, status: 'REGISTERED' },
        { $set: { status: 'WITHDRAWN', withdrawnAt: new Date() } }
      );
    }

    await opportunity.save();

    res.status(200).json({
      success: true,
      message: `Opportunity status updated to ${status}`,
      data: opportunity
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an opportunity
 * @route   DELETE /api/opportunities/:id
 * @access  Private (ADMIN)
 */
const deleteOpportunity = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    // Cascade delete any associated registrations
    await Registration.deleteMany({ opportunity: opportunity._id });
    await opportunity.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Opportunity deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get volunteers registered for an opportunity
 * @route   GET /api/opportunities/:id/volunteers
 * @access  Private (ADMIN)
 */
const getOpportunityVolunteers = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    const registrations = await Registration.find({ opportunity: req.params.id })
      .populate('user', 'name email role')
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
 * @desc    Register for an opportunity (Capacity-safe atomic algorithm §8)
 * @route   POST /api/opportunities/:id/register
 * @access  Private (USER)
 */
const registerForOpportunity = async (req, res, next) => {
  try {
    const opportunityId = req.params.id;
    const userId = req.user._id;

    // Step 1: Load the opportunity
    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    if (opportunity.status !== 'OPEN') {
      return res.status(409).json({
        success: false,
        message: 'Opportunity is not open for registration'
      });
    }

    if (new Date(opportunity.dateTime) <= new Date()) {
      return res.status(409).json({
        success: false,
        message: 'Opportunity has already occurred'
      });
    }

    // Step 2: Check existing registration for this user
    const existingReg = await Registration.findOne({ user: userId, opportunity: opportunityId });
    if (existingReg && existingReg.status === 'REGISTERED') {
      return res.status(409).json({
        success: false,
        message: 'Already registered for this opportunity'
      });
    }

    // Step 3: Atomically increment registeredCount only if registeredCount < requiredVolunteers AND status = OPEN
    const updatedOpp = await Opportunity.findOneAndUpdate(
      {
        _id: opportunityId,
        status: 'OPEN',
        $expr: { $lt: ['$registeredCount', '$requiredVolunteers'] }
      },
      { $inc: { registeredCount: 1 } },
      { new: true }
    );

    if (!updatedOpp) {
      return res.status(409).json({
        success: false,
        message: 'No available slots'
      });
    }

    // Step 4: Upsert the Registration document to status = REGISTERED
    let registration;
    try {
      if (existingReg) {
        // Re-registration flips existing record back to REGISTERED
        existingReg.status = 'REGISTERED';
        existingReg.registeredAt = new Date();
        existingReg.withdrawnAt = null;
        await existingReg.save();
        registration = existingReg;
      } else {
        registration = await Registration.create({
          user: userId,
          opportunity: opportunityId,
          status: 'REGISTERED',
          registeredAt: new Date()
        });
      }
    } catch (saveError) {
      // Step 4 rollback: if saving registration fails, decrement registeredCount
      await Opportunity.findByIdAndUpdate(opportunityId, {
        $inc: { registeredCount: -1 }
      });
      throw saveError;
    }

    res.status(201).json({
      success: true,
      message: 'Registered successfully',
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  updateOpportunityStatus,
  deleteOpportunity,
  getOpportunityVolunteers,
  registerForOpportunity
};
