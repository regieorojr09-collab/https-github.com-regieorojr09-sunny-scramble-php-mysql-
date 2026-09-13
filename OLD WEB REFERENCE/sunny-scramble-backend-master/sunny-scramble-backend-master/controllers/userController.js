const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// GET all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching users', error: error.message });
  }
};

// POST create a user (for admins/superadmins)
exports.createUser = async (req, res) => {
  try {
    const { fullName, email, role } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // Generate random password
    const generatedPassword = crypto.randomBytes(4).toString('hex');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(generatedPassword, salt);

    const newUser = new User({ fullName, email, role, passwordHash, mustChangePassword: true });
    await newUser.save();

    res.status(201).json({ 
      message: 'User created successfully', 
      user: { id: newUser._id, fullName, email, role },
      generatedPassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating user', error: error.message });
  }
};

// PUT update a user (role/name/status)
exports.updateUser = async (req, res) => {
  try {
    const { fullName, role, status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.fullName = fullName || user.fullName;
    user.role = role || user.role;
    user.status = status || user.status;

    await user.save();
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating user', error: error.message });
  }
};

// DELETE a user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'owner') {
      return res.status(403).json({ message: 'Owner account cannot be deleted' });
    }

    await user.deleteOne();
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting user', error: error.message });
  }
};

// PUT change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (!user.mustChangePassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password is required' });
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });
    }
    
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    await user.save();
    
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error changing password', error: error.message });
  }
};

// PUT reset password (admin/owner)
exports.resetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate random password
    const generatedPassword = crypto.randomBytes(4).toString('hex');
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(generatedPassword, salt);
    user.mustChangePassword = true;

    await user.save();

    res.status(200).json({ message: 'Password reset successfully', generatedPassword });
  } catch (error) {
    res.status(500).json({ message: 'Server error resetting password', error: error.message });
  }
};
