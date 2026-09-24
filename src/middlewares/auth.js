const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');

/**
 * Protect middleware:
 * - Checks httpOnly cookie first, then Authorization Bearer header
 * - Verifies token
 * - Re-checks user exists AND isActive in DB on every request
 */
const protect = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication token is required'));
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_jwt_key_volunteer_mgmt_2026_dev_mode'
    );

    // Re-check user exists and isActive on every request
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'User account does not exist'));
    }

    if (!user.isActive) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'User account is deactivated'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role authorization middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'FORBIDDEN', 'Forbidden: You do not have permission to access this resource')
      );
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};
