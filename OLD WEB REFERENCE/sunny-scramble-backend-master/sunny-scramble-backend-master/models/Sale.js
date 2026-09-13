const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  subtotalAmount: { type: Number, required: false, default: 0 },
  taxAmount: { type: Number, required: false, default: 0 },
  totalAmount: { type: Number, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiptImage: { type: String, required: false },
  saleDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);