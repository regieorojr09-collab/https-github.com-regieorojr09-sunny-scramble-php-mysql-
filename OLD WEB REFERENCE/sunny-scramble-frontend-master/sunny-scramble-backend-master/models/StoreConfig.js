const mongoose = require('mongoose');

const storeConfigSchema = new mongoose.Schema({
  storeName: { type: String, default: 'Sunny & Scramble' },
  storeAddress: { type: String, default: '' },
  storeContact: { type: String, default: '' },
  branchName: { type: String, default: 'Malanday, San Mateo, Rizal' },
  taxRate: { type: Number, default: 0 },
  taxRegistrationNumber: { type: String, default: '' },
  receiptFooter: { type: String, default: 'Thank you for your purchase!' },
  lowStockThreshold: { type: Number, default: 20 },
  currency: { type: String, default: 'PHP' }
}, { timestamps: true });

module.exports = mongoose.model('StoreConfig', storeConfigSchema);
