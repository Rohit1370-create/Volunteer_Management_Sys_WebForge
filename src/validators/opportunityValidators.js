const { body, query } = require('express-validator');

const createOpportunityValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Opportunity title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim(),
  body('dateTime')
    .notEmpty()
    .withMessage('dateTime is required')
    .isISO8601()
    .withMessage('dateTime must be a valid ISO 8601 date string')
    .custom(value => {
      if (new Date(value) <= new Date()) {
        throw new Error('dateTime must be in the future');
      }
      return true;
    }),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('location is required'),
  body('requiredVolunteers')
    .notEmpty()
    .withMessage('requiredVolunteers is required')
    .isInt({ min: 1 })
    .withMessage('requiredVolunteers must be an integer greater than or equal to 1'),
  body('club')
    .optional()
    .isMongoId()
    .withMessage('Invalid club ID format'),
  body('event')
    .optional()
    .isMongoId()
    .withMessage('Invalid event ID format')
];

const updateOpportunityValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim(),
  body('dateTime')
    .optional()
    .isISO8601()
    .withMessage('dateTime must be a valid ISO 8601 date string'),
  body('location')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Location cannot be empty'),
  body('requiredVolunteers')
    .optional()
    .isInt({ min: 1 })
    .withMessage('requiredVolunteers must be an integer greater than or equal to 1'),
  body('status')
    .optional()
    .isIn(['OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED'])
    .withMessage('status must be OPEN, CLOSED, CANCELLED, or COMPLETED'),
  body('club')
    .optional()
    .isMongoId()
    .withMessage('Invalid club ID format'),
  body('event')
    .optional()
    .isMongoId()
    .withMessage('Invalid event ID format')
];

const filterOpportunitiesValidator = [
  query('status')
    .optional()
    .isIn(['OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED'])
    .withMessage('Status filter must be OPEN, CLOSED, CANCELLED, or COMPLETED'),
  query('club')
    .optional()
    .isMongoId()
    .withMessage('Invalid club ID format'),
  query('event')
    .optional()
    .isMongoId()
    .withMessage('Invalid event ID format'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
];

module.exports = {
  createOpportunityValidator,
  updateOpportunityValidator,
  filterOpportunitiesValidator
};
