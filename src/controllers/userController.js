const User = require('../models/User');

/**
 * @desc    Get all volunteers (users) list
 * @route   GET /api/users
 * @access  Private (ADMIN)
 */
const getVolunteers = async (req, res, next) => {
  try {
    const volunteers = await User.find({ role: 'USER' }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: volunteers.length,
      data: volunteers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single volunteer profile by ID
 * @route   GET /api/users/:id
 * @access  Private (ADMIN)
 */
const getVolunteerById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update own profile (name only, role and sensitive fields protected §11)
 * @route   PATCH /api/users/me
 * @access  Private (USER, ADMIN)
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const { name } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only allow updating whitelisted non-sensitive fields
    if (name !== undefined) {
      user.name = name;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVolunteers,
  getVolunteerById,
  updateMyProfile
};
