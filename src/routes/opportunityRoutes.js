const express = require('express');
const router = express.Router();
const {
  getOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  updateOpportunityStatus,
  deleteOpportunity,
  getOpportunityVolunteers,
  registerForOpportunity
} = require('../controllers/opportunityController');
const {
  createOpportunityValidator,
  updateOpportunityValidator,
  updateStatusValidator,
  opportunityIdValidator,
  filterOpportunitiesValidator
} = require('../validators/opportunityValidators');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

// All opportunity routes require authentication
router.use(protect);

router
  .route('/')
  .get(authorize('USER', 'ADMIN'), filterOpportunitiesValidator, validate, getOpportunities)
  .post(authorize('ADMIN'), createOpportunityValidator, validate, createOpportunity);

router
  .route('/:id')
  .get(authorize('USER', 'ADMIN'), opportunityIdValidator, validate, getOpportunity)
  .patch(authorize('ADMIN'), updateOpportunityValidator, validate, updateOpportunity)
  .delete(authorize('ADMIN'), opportunityIdValidator, validate, deleteOpportunity);

router.patch(
  '/:id/status',
  authorize('ADMIN'),
  updateStatusValidator,
  validate,
  updateOpportunityStatus
);

router.get(
  '/:id/volunteers',
  authorize('ADMIN'),
  opportunityIdValidator,
  validate,
  getOpportunityVolunteers
);

router.post(
  '/:id/register',
  authorize('USER'),
  opportunityIdValidator,
  validate,
  registerForOpportunity
);

module.exports = router;
