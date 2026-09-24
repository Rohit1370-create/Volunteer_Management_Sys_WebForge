const { body, param } = require('express-validator');

const updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('role')
    .optional()
    .custom(() => {
      throw new Error('Role cannot be changed');
    }),
  body('password')
    .optional()
    .custom(() => {
      throw new Error('Password cannot be changed via profile update');
    }),
  body('email')
    .optional()
    .custom(() => {
      throw new Error('Email cannot be changed');
    })
];

const userIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

module.exports = {
  updateProfileValidator,
  userIdValidator
};
