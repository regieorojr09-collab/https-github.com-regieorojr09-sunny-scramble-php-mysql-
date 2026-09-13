const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

const exportDatabase = async (req, res) => {
  try {
    const collections = mongoose.connection.collections;
    const exportData = {};

    for (const key in collections) {
      const collectionName = collections[key].name;
      const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
      exportData[collectionName] = data;
    }

    if (req.user) {
      const auditLog = new AuditLog({
        userId: req.user.id,
        action: 'Exported database backup',
        module: 'Settings'
      });
      await auditLog.save();
    }

    res.setHeader('Content-disposition', `attachment; filename=sunny_scramble_backup_${Date.now()}.json`);
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(exportData, null, 2));

  } catch (error) {
    res.status(500).json({ message: 'Error exporting database', error: error.message });
  }
};

module.exports = {
  exportDatabase
};
