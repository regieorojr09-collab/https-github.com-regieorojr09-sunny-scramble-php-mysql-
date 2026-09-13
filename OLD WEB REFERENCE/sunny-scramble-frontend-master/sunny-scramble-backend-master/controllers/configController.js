const StoreConfig = require('../models/StoreConfig');
const AuditLog = require('../models/AuditLog');

const getConfig = async (req, res) => {
  try {
    let config = await StoreConfig.findOne();
    if (!config) {
      config = await StoreConfig.create({}); // Create default config if it doesn't exist
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching config', error: error.message });
  }
};

const updateConfig = async (req, res) => {
  try {
    let config = await StoreConfig.findOne();
    if (!config) {
      config = await StoreConfig.create(req.body);
    } else {
      config = await StoreConfig.findOneAndUpdate({}, req.body, { new: true });
    }

    // Save an Audit Log
    if (req.user) {
      const auditLog = new AuditLog({
        userId: req.user.id,
        action: `Updated store configuration`,
        module: 'Settings'
      });
      await auditLog.save();
    }

    res.json({ message: 'Configuration updated successfully', config });
  } catch (error) {
    res.status(500).json({ message: 'Error updating config', error: error.message });
  }
};

module.exports = {
  getConfig,
  updateConfig
};
