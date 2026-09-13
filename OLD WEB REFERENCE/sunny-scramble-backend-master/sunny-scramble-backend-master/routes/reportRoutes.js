const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

// Get overall dashboard summary
router.get('/summary', protect, getDashboardSummary);

const { getSalesSummary, getExpenseSummary, getIncomeStatement } = require('../controllers/reportController');

// New reporting routes
router.get('/sales-summary', protect, getSalesSummary);
router.get('/expense-summary', protect, getExpenseSummary);
router.get('/income-statement', protect, getIncomeStatement);

module.exports = router;