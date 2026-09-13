const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  supplierId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Supplier', 
    required: true 
  },
  referenceNo: { 
    type: String 
  },
  quantity: { 
    type: Number, 
    required: true 
  },
  unitCost: { 
    type: Number, 
    required: true 
  },
  totalCost: { 
    type: Number, 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);