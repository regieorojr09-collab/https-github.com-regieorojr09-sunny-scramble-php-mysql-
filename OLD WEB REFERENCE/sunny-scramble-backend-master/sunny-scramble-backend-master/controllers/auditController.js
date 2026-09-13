const AuditLog = require('../models/AuditLog');

// GET all audit logs
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('userId', 'fullName role email')
      .sort({ createdAt: -1 }); // Newest first
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching audit logs', error: error.message });
  }
};
