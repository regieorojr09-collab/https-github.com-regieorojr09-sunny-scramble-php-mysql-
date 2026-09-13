const express = require('express');
const router = express.Router();
const { getSpoilages, recordSpoilage } = require('../controllers/spoilageController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSpoilages)
  .post(protect, recordSpoilage);

module.exports = router;
