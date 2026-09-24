const mongoose = require('mongoose');
const ApiError = require('../utils/apiError');

/**
 * Validates that specified route parameter is a valid MongoDB ObjectId
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (value && !mongoose.Types.ObjectId.isValid(value)) {
      return next(new ApiError(400, 'INVALID_ID', `Invalid ${paramName} format: ${value}`));
    }
    next();
  };
};

module.exports = validateObjectId;
