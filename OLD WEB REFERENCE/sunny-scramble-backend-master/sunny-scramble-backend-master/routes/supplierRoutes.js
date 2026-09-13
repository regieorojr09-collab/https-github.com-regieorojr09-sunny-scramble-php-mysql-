const express = require('express');
const router = express.Router();
const { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/supplierController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, createSupplier);

router.route('/:id')
  .get(protect, getSupplierById)
  .put(protect, updateSupplier)
  .delete(protect, deleteSupplier);

module.exports = router;
