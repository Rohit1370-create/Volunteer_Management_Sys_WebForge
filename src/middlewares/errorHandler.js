/**
 * Centralized error handler
 * Formats every failure into:
 * { success: false, error: { code, message, details? } }
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // 1. Mongoose Bad ObjectId (CastError) -> 400 INVALID_ID
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ID format for ${err.path}: ${err.value}`;
  }

  // 2. Mongo Duplicate Key Error (11000) -> 409 DUPLICATE_*
  if (err.code === 11000) {
    statusCode = 409;
    if (err.keyPattern && (err.keyPattern.user || err.keyPattern.opportunity)) {
      code = 'DUPLICATE_REGISTRATION';
      message = 'User already holds an active registration for this opportunity';
    } else if (err.keyPattern && err.keyPattern.email) {
      code = 'DUPLICATE_EMAIL';
      message = 'An account with this email address already exists';
    } else if (err.keyPattern && err.keyPattern.name) {
      code = 'DUPLICATE_NAME';
      message = 'A record with this name already exists';
    } else {
      code = 'DUPLICATE_RECORD';
      message = 'Duplicate key error on resource';
    }
  }

  // 3. Mongoose Validation Error -> 400 VALIDATION_ERROR
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const errorDetails = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
    message = errorDetails[0]?.message || 'Validation error';
    details = errorDetails;
  }

  // 4. JWT Errors -> 401
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired, please log in again';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Authentication token is invalid';
  }

  // Server-side stack logging for 500 errors only (never exposed to client)
  if (statusCode === 500) {
    console.error('Unhandled Server Error [500]:', err);
  }

  const responseBody = {
    success: false,
    error: {
      code,
      message
    }
  };

  if (details) {
    responseBody.error.details = details;
  }

  return res.status(statusCode).json(responseBody);
};

module.exports = errorHandler;
