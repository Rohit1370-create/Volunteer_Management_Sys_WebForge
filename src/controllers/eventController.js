const Event = require('../models/Event');
const Club = require('../models/Club');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/responseEnvelope');

/**
 * @desc    Get all events, filterable by club
 * @route   GET /api/v1/events
 * @access  Protected
 */
const getEvents = async (req, res, next) => {
  try {
    const { club } = req.query;
    const query = {};

    if (club) {
      query.club = club;
    }

    const events = await Event.find(query)
      .populate('club', 'name description')
      .sort({ startDate: 1 });

    return sendSuccess(res, 200, events);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new event
 * @route   POST /api/v1/events
 * @access  Admin
 */
const createEvent = async (req, res, next) => {
  try {
    // Explicit allow-list destructuring
    const { name, description, club, startDate, endDate } = req.body;

    // Verify club exists
    const clubDoc = await Club.findById(club);
    if (!clubDoc) {
      return next(new ApiError(404, 'NOT_FOUND', 'Specified club does not exist'));
    }

    const event = await Event.create({
      name,
      description: description || '',
      club,
      startDate: startDate || null,
      endDate: endDate || null
    });

    return sendSuccess(res, 201, event, 'Event created successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  createEvent
};
