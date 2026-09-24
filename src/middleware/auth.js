const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect middleware:
 * - Checks for JWT token in HTTP-only cookie first, falls back to Authorization Bearer header
 * - Decodes token and re-reads user from database on every request
 * - Ensures deleted accounts or altered roles immediately take effect
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
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, token missing'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_volunteer_mgmt_2026_dev_mode');
    
    // Re-read user from DB to ensure account still exists and role is current
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists or session is invalid'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, token invalid'
    });
  }
};

/**
 * Role-Based Access Control (RBAC) middleware:
 * Ensures the authenticated user matches one of the authorized roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions for this resource'
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};
