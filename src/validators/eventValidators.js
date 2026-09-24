const { body } = require('express-validator');

const createEventValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Event name is required')
    .isLength({ max: 200 })
    .withMessage('Event name cannot exceed 200 characters'),
  body('club')
    .notEmpty()
    .withMessage('Club ID is required')
    .isMongoId()
    .withMessage('Invalid club ID format'),
  body('description')
    .optional()
    .trim(),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date')
];

module.exports = {
  createEventValidator
};
