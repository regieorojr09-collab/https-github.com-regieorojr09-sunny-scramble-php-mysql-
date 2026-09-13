const mongoose = require('mongoose');

const customerReturnSchema = new mongoose.Schema({
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer',
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
    enum: ['Defective', 'Wrong Item', 'Dissatisfied', 'Other'],
    required: true 
  },
  action: { 
    type: String, 
    enum: ['Refunded', 'Replaced', 'Store Credit'],
    required: true 
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

module.exports = mongoose.model('CustomerReturn', customerReturnSchema);
