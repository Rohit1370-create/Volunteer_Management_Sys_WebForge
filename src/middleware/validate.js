const { validationResult } = require('express-validator');

/**
 * Middleware to check express-validator validation results
 * Returns 400 with normalized JSON error shape if validation fails
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    return res.status(400).json({
      success: false,
      message: errorArray[0].msg,
      errors: errorArray.map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = validate;
