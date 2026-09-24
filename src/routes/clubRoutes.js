const express = require('express');
const router = express.Router();
const { getClubs, createClub } = require('../controllers/clubController');
const { createClubValidator } = require('../validators/clubValidators');
const validate = require('../middlewares/validate');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router
  .route('/')
  .get(getClubs)
  .post(authorize('ADMIN'), createClubValidator, validate, createClub);

module.exports = router;
