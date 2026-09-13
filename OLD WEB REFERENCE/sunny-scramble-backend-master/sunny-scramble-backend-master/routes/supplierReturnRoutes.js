const express = require('express');
const router = express.Router();
const { getSupplierReturns, createSupplierReturn, updateSupplierReturnStatus } = require('../controllers/supplierReturnController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSupplierReturns)
  .post(protect, createSupplierReturn);

router.route('/:id/status')
  .put(protect, updateSupplierReturnStatus);

module.exports = router;
