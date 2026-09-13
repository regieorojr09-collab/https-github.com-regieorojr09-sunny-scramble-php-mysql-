const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: { type: String, enum: ['stock-in', 'stock-out'], required: true },
  quantity: { type: Number, required: true },
  reason: { type: String }, // e.g., 'sold', 'damaged', 'delivery'
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);