const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  supplierName: { type: String, required: true },
  contact: { type: String, required: true },
  address: { type: String, required: true },
  contactPerson: { type: String, default: '' },
  email: { type: String, default: '' },
  paymentTerms: { type: String, default: 'COD' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);