const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

/**
 * Validates express-validator results
 * Normalizes to { success: false, error: { code: 'VALIDATION_ERROR', message, details } }
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array();
    const firstMessage = errorList[0].msg;
    return next(
      new ApiError(
        400,
        'VALIDATION_ERROR',
        firstMessage,
        errorList.map(err => ({
          field: err.path || err.param,
          message: err.msg
        }))
      )
    );
  }
  next();
};

module.exports = validate;
