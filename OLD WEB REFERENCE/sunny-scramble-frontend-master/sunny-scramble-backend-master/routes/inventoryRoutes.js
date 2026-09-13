const express = require('express');
const router = express.Router();
const { recordTransaction, getProductHistory } = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, recordTransaction);
router.get('/:productId/history', protect, getProductHistory);

module.exports = router;