const express = require('express');
const router = express.Router();
const {
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  registerOpportunity,
  getOpportunityVolunteers,
  exportVolunteersExcel
} = require('../controllers/opportunityController');
const {
  createOpportunityValidator,
  updateOpportunityValidator,
  filterOpportunitiesValidator
} = require('../validators/opportunityValidators');
const validate = require('../middlewares/validate');
const validateObjectId = require('../middlewares/validateObjectId');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router
  .route('/')
  .get(filterOpportunitiesValidator, validate, getOpportunities)
  .post(authorize('ADMIN'), createOpportunityValidator, validate, createOpportunity);

router
  .route('/:id')
  .get(validateObjectId('id'), getOpportunityById)
  .patch(authorize('ADMIN'), validateObjectId('id'), updateOpportunityValidator, validate, updateOpportunity)
  .delete(authorize('ADMIN'), validateObjectId('id'), deleteOpportunity);

router.post(
  '/:id/register',
  authorize('USER'),
  validateObjectId('id'),
  registerOpportunity
);

router.get(
  '/:id/volunteers',
  authorize('ADMIN'),
  validateObjectId('id'),
  getOpportunityVolunteers
);

router.get(
  '/:id/volunteers/export',
  authorize('ADMIN'),
  validateObjectId('id'),
  exportVolunteersExcel
);

module.exports = router;
