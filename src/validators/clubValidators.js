const { body } = require('express-validator');

const createClubValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Club name is required')
    .isLength({ max: 100 })
    .withMessage('Club name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
];

module.exports = {
  createClubValidator
};
