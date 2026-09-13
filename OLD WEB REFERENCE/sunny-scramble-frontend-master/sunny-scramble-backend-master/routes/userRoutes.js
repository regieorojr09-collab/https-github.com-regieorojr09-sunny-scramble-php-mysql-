const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser, changePassword } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.put('/change-password', protect, changePassword);

// Note: role-based check can be added if needed, currently just require authentication
router.route('/')
  .get(protect, authorize('admin', 'owner', 'superadmin'), getUsers)
  .post(protect, authorize('admin', 'owner', 'superadmin'), createUser);

router.route('/:id')
  .put(protect, authorize('admin', 'owner', 'superadmin'), updateUser)
  .delete(protect, authorize('admin', 'owner', 'superadmin'), deleteUser);

router.put('/:id/reset-password', protect, authorize('admin', 'owner', 'superadmin'), require('../controllers/userController').resetPassword);

module.exports = router;
