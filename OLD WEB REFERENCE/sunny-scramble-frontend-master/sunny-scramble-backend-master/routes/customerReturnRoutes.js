const express = require('express');
const router = express.Router();
const { getCustomerReturns, createCustomerReturn } = require('../controllers/customerReturnController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getCustomerReturns)
  .post(protect, createCustomerReturn);

module.exports = router;
