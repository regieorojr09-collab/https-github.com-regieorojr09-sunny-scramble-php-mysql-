const express = require('express');
const router = express.Router();
const { getProducts, createProduct, updateProduct } = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(protect, getProducts)
  .post(protect, upload.single('image'), createProduct);

router.route('/:id')
  .put(protect, upload.single('image'), updateProduct);

module.exports = router;