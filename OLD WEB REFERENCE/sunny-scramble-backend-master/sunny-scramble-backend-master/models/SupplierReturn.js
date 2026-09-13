const mongoose = require('mongoose');

const supplierReturnSchema = new mongoose.Schema({
  supplierId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Supplier',
    required: true
  },
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product',
    required: true
  },
  quantity: { 
    type: Number, 
    required: true 
  },
  reason: { 
    type: String, 
    enum: ['Defective', 'Expired', 'Wrong Delivery', 'Other'],
    required: true 
  },
  action: { 
    type: String, 
    enum: ['Pending', 'Refunded', 'Replaced'],
    default: 'Pending' 
  },
  amountRefunded: { 
    type: Number, 
    default: 0 
  },
  notes: {
    type: String,
    default: ''
  },
  processedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

module.exports = mongoose.model('SupplierReturn', supplierReturnSchema);
