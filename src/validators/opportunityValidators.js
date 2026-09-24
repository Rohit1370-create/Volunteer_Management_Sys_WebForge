const { body, param, query } = require('express-validator');

const createOpportunityValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
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
    .withMessage('Location is required'),
  body('requiredVolunteers')
    .notEmpty()
    .withMessage('requiredVolunteers is required')
    .isInt({ min: 1 })
    .withMessage('requiredVolunteers must be an integer greater than or equal to 1')
];

const updateOpportunityValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid opportunity ID format'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty'),
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
    .custom(() => {
      throw new Error('Status cannot be changed via general update route. Use /api/opportunities/:id/status');
    })
];

const updateStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid opportunity ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED'])
    .withMessage('Status must be one of: OPEN, CLOSED, COMPLETED, CANCELLED')
];

const opportunityIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid opportunity ID format')
];

const filterOpportunitiesValidator = [
  query('status')
    .optional()
    .isIn(['OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED'])
    .withMessage('Status filter must be OPEN, CLOSED, COMPLETED, or CANCELLED'),
  query('upcoming')
    .optional()
    .isBoolean()
    .withMessage('Upcoming filter must be true or false'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

module.exports = {
  createOpportunityValidator,
  updateOpportunityValidator,
  updateStatusValidator,
  opportunityIdValidator,
  filterOpportunitiesValidator
};
