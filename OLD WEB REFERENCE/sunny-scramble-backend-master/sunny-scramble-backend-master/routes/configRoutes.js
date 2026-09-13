const express = require('express');
const router = express.Router();
const { getConfig, updateConfig } = require('../controllers/configController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(getConfig) // public or protected depending on needs, but typically protect
  .put(protect, authorize('admin', 'owner', 'superadmin'), updateConfig);

module.exports = router;
