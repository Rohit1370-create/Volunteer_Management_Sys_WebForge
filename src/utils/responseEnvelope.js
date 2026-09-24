/**
 * Send standard success response envelope
 * { success: true, data: ..., message?: ... }
 */
const sendSuccess = (res, statusCode, data, message = null) => {
  const response = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess
};
