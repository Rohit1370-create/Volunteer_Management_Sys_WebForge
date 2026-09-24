const { body, param, query } = require('express-validator');

const registrationIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid registration ID format')
];

const updateRegistrationStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid registration ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['ATTENDED', 'ABSENT', 'WITHDRAWN'])
    .withMessage('Status must be ATTENDED, ABSENT, or WITHDRAWN')
];

const filterRegistrationsValidator = [
  query('opportunity')
    .optional()
    .isMongoId()
    .withMessage('Invalid opportunity ID format in query'),
  query('user')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format in query'),
  query('status')
    .optional()
    .isIn(['REGISTERED', 'WITHDRAWN', 'ATTENDED', 'ABSENT'])
    .withMessage('Status filter must be REGISTERED, WITHDRAWN, ATTENDED, or ABSENT'),
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
  registrationIdValidator,
  updateRegistrationStatusValidator,
  filterRegistrationsValidator
};
