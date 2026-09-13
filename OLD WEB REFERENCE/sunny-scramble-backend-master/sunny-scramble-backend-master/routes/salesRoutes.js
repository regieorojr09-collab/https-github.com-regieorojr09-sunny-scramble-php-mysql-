const express = require('express');
const router = express.Router();
const { recordSale, getSales, uploadReceipt } = require('../controllers/salesController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(protect, getSales)
  .post(protect, recordSale);

router.route('/:id/receipt')
  .post(protect, upload.single('image'), uploadReceipt);

module.exports = router;