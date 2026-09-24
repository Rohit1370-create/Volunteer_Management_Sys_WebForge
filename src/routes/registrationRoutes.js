const express = require('express');
const router = express.Router();
const { withdraw, getMyRegistrations } = require('../controllers/registrationController');
const validateObjectId = require('../middlewares/validateObjectId');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/me', getMyRegistrations);
router.patch('/:id/withdraw', validateObjectId('id'), withdraw);

module.exports = router;
