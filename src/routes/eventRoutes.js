const express = require('express');
const router = express.Router();
const { getEvents, createEvent } = require('../controllers/eventController');
const { createEventValidator } = require('../validators/eventValidators');
const validate = require('../middlewares/validate');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router
  .route('/')
  .get(getEvents)
  .post(authorize('ADMIN'), createEventValidator, validate, createEvent);

module.exports = router;
