const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/responseEnvelope');

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'super_secret_jwt_key_volunteer_mgmt_2026_dev_mode',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  const cookieOptions = {
    expires: new Date(
      Date.now() + (parseInt(process.env.COOKIE_EXPIRE, 10) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  };

  res.cookie('token', token, cookieOptions);

  return res.status(statusCode).json({
    success: true,
    data: {
      user,
      token // Provided so Postman/clients can also use Authorization: Bearer fallback easily
    },
    message
  });
};

/**
 * @desc    Register a new user (always forced to USER role server-side)
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    // Explicit allow-list destructuring
    const { name, email, password, phone, branch, section, yearOfStudy } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ApiError(409, 'DUPLICATE_EMAIL', 'An account with this email address already exists'));
    }

    // Role is strictly forced to USER server-side
    const user = await User.create({
      name,
      email,
      password,
      role: 'USER',
      phone: phone || null,
      branch: branch || null,
      section: section || null,
      yearOfStudy: yearOfStudy || null,
      isActive: true
    });

    sendTokenResponse(user, 201, res, 'User registered successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user & set JWT in httpOnly cookie
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid credentials'));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid credentials'));
    }

    if (!user.isActive) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'User account is deactivated'));
    }

    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user & clear cookie
 * @route   POST /api/v1/auth/logout
 * @access  Protected
 */
const logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  return sendSuccess(res, 200, null, 'Logged out successfully');
};

/**
 * @desc    Get caller's own profile
 * @route   GET /api/v1/auth/me
 * @access  Protected
 */
const getMe = async (req, res) => {
  return sendSuccess(res, 200, req.user);
};

module.exports = {
  register,
  login,
  logout,
  getMe
};
