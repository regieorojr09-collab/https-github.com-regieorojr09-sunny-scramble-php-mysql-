const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const Product = require('../models/Product');
const { protect } = require('../middleware/authMiddleware');

// GET all deliveries (Populates the actual product name instead of just the ID)
router.get('/', protect, async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate('productId')
      .populate('supplierId')
      .sort({ createdAt: -1 }); // Newest first
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching deliveries' });
  }
});

// POST a new delivery AND update product stock
router.post('/', protect, async (req, res) => {
  try {
    const { productId, supplierId, referenceNo, quantity, unitCost, totalCost } = req.body;

    // 1. Save the new delivery record
    const newDelivery = new Delivery({
      productId,
      supplierId,
      referenceNo,
      quantity,
      unitCost,
      totalCost
    });
    await newDelivery.save();

    // 2. Find the product and increase its stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.quantity += quantity; // Increase stock
    product.unitCost = unitCost;  // Update to the most recent supplier cost
    await product.save();

    res.status(201).json({ message: 'Delivery logged successfully', delivery: newDelivery });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error logging delivery' });
  }
});

module.exports = router;