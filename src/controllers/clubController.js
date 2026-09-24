const Club = require('../models/Club');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/responseEnvelope');

/**
 * @desc    Get all clubs (open to all authenticated users)
 * @route   GET /api/v1/clubs
 * @access  Protected
 */
const getClubs = async (req, res, next) => {
  try {
    const clubs = await Club.find()
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    return sendSuccess(res, 200, clubs);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new club
 * @route   POST /api/v1/clubs
 * @access  Admin
 */
const createClub = async (req, res, next) => {
  try {
    // Explicit allow-list destructuring
    const { name, description } = req.body;

    const existingClub = await Club.findOne({ name });
    if (existingClub) {
      return next(new ApiError(409, 'DUPLICATE_CLUB', 'A club with this name already exists'));
    }

    const club = await Club.create({
      name,
      description: description || '',
      createdBy: req.user._id
    });

    return sendSuccess(res, 201, club, 'Club created successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClubs,
  createClub
};
