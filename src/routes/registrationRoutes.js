const express = require('express');
const router = express.Router();
const {
  withdrawRegistration,
  getMyRegistrations,
  getAllRegistrations,
  updateRegistrationStatus
} = require('../controllers/registrationController');
const {
  registrationIdValidator,
  updateRegistrationStatusValidator,
  filterRegistrationsValidator
} = require('../validators/registrationValidators');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// USER routes
router.get('/me', authorize('USER'), getMyRegistrations);
router.patch('/:id/withdraw', authorize('USER'), registrationIdValidator, validate, withdrawRegistration);

// ADMIN routes
router.get('/', authorize('ADMIN'), filterRegistrationsValidator, validate, getAllRegistrations);
router.patch('/:id/status', authorize('ADMIN'), updateRegistrationStatusValidator, validate, updateRegistrationStatus);

module.exports = router;
