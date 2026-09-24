/**
 * Centralized Express Error Handling Middleware
 * Normalizes every failure into a consistent JSON shape:
 * { "success": false, "message": "..." }
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.error('ErrorHandler caught:', err);
  }

  // 1. Mongoose Bad ObjectId (CastError) -> 400
  if (err.name === 'CastError') {
    const message = `Invalid resource ID format: ${err.value}`;
    return res.status(400).json({
      success: false,
      message
    });
  }

  // 2. Mongoose Duplicate Key Error (E11000) -> 409
  if (err.code === 11000) {
    let message = 'Duplicate key error';
    if (err.keyPattern && err.keyPattern.email) {
      message = 'Email is already registered';
    } else if (err.keyPattern && err.keyPattern.user && err.keyPattern.opportunity) {
      message = 'Already registered for this opportunity';
    } else {
      const field = Object.keys(err.keyValue || {})[0];
      message = `${field || 'Record'} already exists with this value`;
    }
    return res.status(409).json({
      success: false,
      message
    });
  }

  // 3. Mongoose Validation Error -> 400
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message)[0] || 'Validation error';
    return res.status(400).json({
      success: false,
      message
    });
  }

  // 4. JWT Error -> 401
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token invalid'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired, please log in again'
    });
  }

  // 5. Default/Custom Status Code or 500
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: error.message || 'Internal Server Error'
  };

  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
