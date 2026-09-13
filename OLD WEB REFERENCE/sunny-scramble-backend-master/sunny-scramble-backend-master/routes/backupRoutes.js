const express = require('express');
const router = express.Router();
const { exportDatabase } = require('../controllers/backupController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Only Admins or Superadmins should be able to backup the DB
router.route('/export')
  .get(protect, authorize('admin', 'owner', 'superadmin'), exportDatabase);

module.exports = router;
