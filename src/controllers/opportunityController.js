const Opportunity = require('../models/Opportunity');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/responseEnvelope');
const { registerUserForOpportunity } = require('../services/registrationService');
const { generateVolunteersExcel } = require('../services/excelService');

/**
 * @desc    Browse opportunities (open to any USER, no club gating)
 * @route   GET /api/v1/opportunities
 * @access  Protected
 */
const getOpportunities = async (req, res, next) => {
  try {
    const { status, club, event, date, upcoming, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (club) {
      query.club = club;
    }

    if (event) {
      query.event = event;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.dateTime = { $gte: startOfDay, $lte: endOfDay };
    } else if (upcoming === 'true') {
      query.dateTime = { $gt: new Date() };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Opportunity.countDocuments(query);
    const opportunities = await Opportunity.find(query)
      .populate('club', 'name description')
      .populate('event', 'name startDate endDate')
      .populate('createdBy', 'name email')
      .sort({ dateTime: 1 })
      .skip(skip)
      .limit(limitNum);

    return sendSuccess(res, 200, {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      count: opportunities.length,
      opportunities
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single opportunity details
 * @route   GET /api/v1/opportunities/:id
 * @access  Protected
 */
const getOpportunityById = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id)
      .populate('club', 'name description')
      .populate('event', 'name startDate endDate')
      .populate('createdBy', 'name email');

    if (!opportunity) {
      return next(new ApiError(404, 'NOT_FOUND', 'Opportunity not found'));
    }

    return sendSuccess(res, 200, opportunity);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new opportunity
 * @route   POST /api/v1/opportunities
 * @access  Admin
 */
const createOpportunity = async (req, res, next) => {
  try {
    // Explicit allow-list destructuring
    const { title, description, event, club, dateTime, location, requiredVolunteers } = req.body;

    let clubId = club;
    // If event is provided and club is not, denormalize club from event
    if (event && !clubId) {
      const eventDoc = await Event.findById(event);
      if (eventDoc) {
        clubId = eventDoc.club;
      }
    }

    const opportunity = await Opportunity.create({
      title,
      description: description || '',
      event: event || null,
      club: clubId || null,
      dateTime,
      location,
      requiredVolunteers,
      registeredCount: 0,
      status: 'OPEN',
      createdBy: req.user._id
    });

    return sendSuccess(res, 201, opportunity, 'Opportunity created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update opportunity fields including status
 * @route   PATCH /api/v1/opportunities/:id
 * @access  Admin
 */
const updateOpportunity = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return next(new ApiError(404, 'NOT_FOUND', 'Opportunity not found'));
    }

    // Explicit allow-list destructuring
    const { title, description, event, club, dateTime, location, requiredVolunteers, status } = req.body;

    if (title !== undefined) opportunity.title = title;
    if (description !== undefined) opportunity.description = description;
    if (event !== undefined) opportunity.event = event;
    if (club !== undefined) opportunity.club = club;
    if (dateTime !== undefined) opportunity.dateTime = dateTime;
    if (location !== undefined) opportunity.location = location;

    if (requiredVolunteers !== undefined) {
      if (requiredVolunteers < opportunity.registeredCount) {
        return next(
          new ApiError(
            400,
            'VALIDATION_ERROR',
            `Cannot set requiredVolunteers (${requiredVolunteers}) below existing registered count (${opportunity.registeredCount})`
          )
        );
      }
      opportunity.requiredVolunteers = requiredVolunteers;
    }

    if (status !== undefined) {
      opportunity.status = status;
      // If cancelled, reset count and bulk-flip registrations to WITHDRAWN
      if (status === 'CANCELLED') {
        opportunity.registeredCount = 0;
        await Registration.updateMany(
          { opportunity: opportunity._id, status: 'REGISTERED' },
          { $set: { status: 'WITHDRAWN', withdrawnAt: new Date() } }
        );
      }
    }

    await opportunity.save();

    return sendSuccess(res, 200, opportunity, 'Opportunity updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft-cancel opportunity (status: CANCELLED, never hard-delete once it has registrations)
 * @route   DELETE /api/v1/opportunities/:id
 * @access  Admin
 */
const deleteOpportunity = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return next(new ApiError(404, 'NOT_FOUND', 'Opportunity not found'));
    }

    // Check if it has any registrations
    const hasRegistrations = await Registration.exists({ opportunity: opportunity._id });

    if (hasRegistrations) {
      // Soft-cancel: status = CANCELLED, registeredCount = 0, bulk flip registrations to WITHDRAWN
      opportunity.status = 'CANCELLED';
      opportunity.registeredCount = 0;
      await opportunity.save();

      await Registration.updateMany(
        { opportunity: opportunity._id, status: 'REGISTERED' },
        { $set: { status: 'WITHDRAWN', withdrawnAt: new Date() } }
      );

      return sendSuccess(res, 200, opportunity, 'Opportunity soft-cancelled (preserved registration history)');
    }

    // If zero registrations, mark CANCELLED or delete
    opportunity.status = 'CANCELLED';
    await opportunity.save();

    return sendSuccess(res, 200, opportunity, 'Opportunity cancelled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register for an opportunity
 * @route   POST /api/v1/opportunities/:id/register
 * @access  User
 */
const registerOpportunity = async (req, res, next) => {
  try {
    const registration = await registerUserForOpportunity(req.user._id, req.params.id);
    return sendSuccess(res, 201, registration, 'Successfully registered for opportunity');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List registered volunteers for an opportunity
 * @route   GET /api/v1/opportunities/:id/volunteers
 * @access  Admin
 */
const getOpportunityVolunteers = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return next(new ApiError(404, 'NOT_FOUND', 'Opportunity not found'));
    }

    const registrations = await Registration.find({
      opportunity: req.params.id,
      status: 'REGISTERED'
    })
      .populate('user', 'name email phone branch section yearOfStudy')
      .sort({ registeredAt: 1 });

    return sendSuccess(res, 200, registrations);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export volunteer list for one opportunity as an .xlsx file
 * @route   GET /api/v1/opportunities/:id/volunteers/export
 *          GET /api/v1/admin/opportunities/:id/volunteers/export
 * @access  Admin
 */
const exportVolunteersExcel = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return next(new ApiError(404, 'NOT_FOUND', 'Opportunity not found'));
    }

    const registrations = await Registration.find({
      opportunity: req.params.id,
      status: 'REGISTERED'
    })
      .populate('user', 'name email phone branch section yearOfStudy')
      .sort({ registeredAt: 1 });

    const buffer = await generateVolunteersExcel(opportunity, registrations);

    const safeTitle = opportunity.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `volunteers-${safeTitle}-${opportunity._id}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  registerOpportunity,
  getOpportunityVolunteers,
  exportVolunteersExcel
};
