const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  unitCost: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  expirationDate: { type: Date },
  maxCapacity: { type: Number, default: 100 },
  imageUrl: { type: String, default: '' },
  status: { type: String, enum: ['active', 'archived'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);