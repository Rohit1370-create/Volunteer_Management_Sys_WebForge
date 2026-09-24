const express = require('express');
const router = express.Router();
const {
  getVolunteers,
  getVolunteerById,
  updateMyProfile
} = require('../controllers/userController');
const {
  updateProfileValidator,
  userIdValidator
} = require('../validators/userValidators');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// USER & ADMIN route for updating own profile
router.patch('/me', authorize('USER', 'ADMIN'), updateProfileValidator, validate, updateMyProfile);

// ADMIN routes for viewing volunteers
router.get('/', authorize('ADMIN'), getVolunteers);
router.get('/:id', authorize('ADMIN'), userIdValidator, validate, getVolunteerById);

module.exports = router;
